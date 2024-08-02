import { useMemo } from "react";

import { useApi } from "~/app/lib/hooks/api";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { useSubscribe } from "~/app/lib/hooks/replicache";

import type { Organization } from "@paperwait/core/organization";
import type {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "@paperwait/core/papercut";
import type { Product } from "@paperwait/core/product";
import type { Room } from "@paperwait/core/room";
import type { PapercutParameter } from "@paperwait/core/schemas";
import type { User } from "@paperwait/core/user";
import type { ReadTransaction } from "replicache";
import type { MutationOptionsFactory } from "~/app/types";

export const useQuery = <TData, TDefaultData = undefined>(
  ...params: Parameters<typeof useSubscribe<TData, TDefaultData>>
) => useSubscribe(...params);

export const queryFactory = {
  organization: (tx: ReadTransaction) =>
    tx
      .scan<Organization>({ prefix: "organization/" })
      .toArray()
      .then((values) => values.at(0)),
  users: (tx: ReadTransaction) => tx.scan<User>({ prefix: "user/" }).toArray(),
  user: (userId: User["id"]) => (tx: ReadTransaction) =>
    tx.get<User>(`user/${userId}`),
  papercutAccounts: (tx: ReadTransaction) =>
    tx.scan<PapercutAccount>({ prefix: "papercutAccount/" }).toArray(),
  papercutAccount:
    (accountId: PapercutAccount["id"]) => (tx: ReadTransaction) =>
      tx.get<PapercutAccount>(`papercutAccount/${accountId}`),
  managedPapercutAccountIds:
    (managerId: User["id"]) => async (tx: ReadTransaction) => {
      const managerAuthorizations = await queryFactory
        .papercutAccountManagerAuthorizations(tx)
        .then((authorizations) =>
          authorizations.filter((a) => a.managerId === managerId),
        );

      return managerAuthorizations.map(
        ({ papercutAccountId }) => papercutAccountId,
      );
    },
  papercutAccountCustomerAuthorizations: (tx: ReadTransaction) =>
    tx
      .scan<PapercutAccountCustomerAuthorization>({
        prefix: "papercutAccountCustomerAuthorization/",
      })
      .toArray(),
  papercutAccountManagerAuthorizations: (tx: ReadTransaction) =>
    tx
      .scan<PapercutAccountManagerAuthorization>({
        prefix: "papercutAccountManagerAuthorization/",
      })
      .toArray(),
  managedCustomerIds:
    (managerId: User["id"]) => async (tx: ReadTransaction) => {
      const getManagedPapercutAccountIds =
        queryFactory.managedPapercutAccountIds(managerId);

      const managedPapercutAccountIds = await getManagedPapercutAccountIds(tx);

      const managedCustomers = await queryFactory
        .papercutAccountCustomerAuthorizations(tx)
        .then((authorizations) =>
          authorizations.filter((a) =>
            managedPapercutAccountIds.includes(a.papercutAccountId),
          ),
        );

      return managedCustomers.map(({ customerId }) => customerId);
    },
  rooms: (tx: ReadTransaction) => tx.scan<Room>({ prefix: "room/" }).toArray(),
  room: (roomId: Room["id"]) => (tx: ReadTransaction) =>
    tx.get<Room>(`room/${roomId}`),
  products: (tx: ReadTransaction) =>
    tx.scan<Product>({ prefix: "product/" }).toArray(),
  product: (productId: Product["id"]) => (tx: ReadTransaction) =>
    tx.get<Product>(`product/${productId}`),
};

export function useMutator() {
  const { replicache } = useAuthenticated();

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
