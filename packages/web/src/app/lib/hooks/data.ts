import { useMemo } from "react";
import { useSubscribe } from "replicache-react";

import { useApi } from "~/app/lib/hooks/api";
import { useReplicache } from "~/app/lib/hooks/replicache";

import type { Organization } from "@paperwait/core/organization";
import type { Room } from "@paperwait/core/room";
import type { PapercutParameter } from "@paperwait/core/schemas";
import type { User } from "@paperwait/core/user";
import type { ReadTransaction } from "replicache";
import type { MutationOptionsFactory } from "~/app/types";

export function useQuery<TData>(
  query: (tx: ReadTransaction) => Promise<TData>,
) {
  const replicache = useReplicache();

  const data = useSubscribe(replicache, query);

  return data;
}

export const queryFactory = {
  organization: (tx: ReadTransaction) =>
    tx
      .scan<Organization>({ prefix: "organization/" })
      .toArray()
      .then((values) => values.at(0)),
  users: (tx: ReadTransaction) => tx.scan<User>({ prefix: "user/" }).toArray(),
  rooms: (tx: ReadTransaction) => tx.scan<Room>({ prefix: "room/" }).toArray(),
  room: (roomId: Room["id"]) => (tx: ReadTransaction) =>
    tx.get<Room>(`room/${roomId}`),
};

export function useMutation() {
  const replicache = useReplicache();

  return replicache.mutate;
}

export function useMutationOptionsFactory() {
  const { client } = useApi();

  const factory = useMemo(
    () =>
      ({
        papercutCredentials: () => ({
          mutationKey: ["papercut", "credentials"] as const,
          mutationFn: async (json: PapercutParameter) => {
            const response =
              await client.api.integrations.papercut.credentials.$put({
                json,
              });

            if (!response.ok) throw new Error(response.statusText);
          },
        }),
        testPapercutConnection: () => ({
          mutationKey: ["papercut", "test"] as const,
          mutationFn: async () => {
            const response =
              await client.api.integrations.papercut.test.$post();

            if (!response.ok) throw new Error(response.statusText);
          },
        }),
        syncPapercutAccounts: () => ({
          mutationKey: ["papercut", "accounts", "sync"] as const,
          mutationFn: async () => {
            const response =
              await client.api.integrations.papercut.accounts.$put({
                json: undefined,
              });

            if (!response.ok) throw new Error(response.statusText);
          },
        }),
      }) satisfies MutationOptionsFactory,
    [client],
  );

  return factory;
}
