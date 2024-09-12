import { useMemo } from "react";

import { useApi } from "~/app/lib/hooks/api";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { useSubscribe } from "~/app/lib/hooks/replicache";

import type { Organization } from "@paperwait/core/organizations/sql";
import type {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "@paperwait/core/papercut/sql";
import type { Product } from "@paperwait/core/products/sql";
import type { Room } from "@paperwait/core/rooms/sql";
import type { User } from "@paperwait/core/users/sql";
import type { MutationOptionsFactory, QueryFactory } from "~/app/types";

export const useQuery = <TData, TDefaultData = undefined>(
  ...params: Parameters<typeof useSubscribe<TData, TDefaultData>>
) => useSubscribe(...params);

export const queryFactory = {
  organization: () => async (tx) => {
    const orgs = await tx
      .scan<Organization>({ prefix: "organization/" })
      .toArray();

    const org = orgs.at(0);

    return org;
  },
  users: () => (tx) => tx.scan<User>({ prefix: "user/" }).toArray(),
  user: (userId: User["id"]) => (tx) => tx.get<User>(`user/${userId}`),
  papercutAccounts: () => (tx) =>
    tx.scan<PapercutAccount>({ prefix: "papercutAccount/" }).toArray(),
  papercutAccount: (accountId: PapercutAccount["id"]) => (tx) =>
    tx.get<PapercutAccount>(`papercutAccount/${accountId}`),
  managedPapercutAccountIds: (managerId: User["id"]) => async (tx) => {
    const managerAuthorizations = await tx
      .scan<PapercutAccountManagerAuthorization>({
        prefix: "papercutAccountManagerAuthorization/",
      })
      .toArray();

    const managedPapercutAccountIds = managerAuthorizations
      .filter((a) => a.managerId === managerId)
      .map(({ papercutAccountId }) => papercutAccountId);

    return managedPapercutAccountIds;
  },
  papercutAccountCustomerAuthorizations: () => (tx) =>
    tx
      .scan<PapercutAccountCustomerAuthorization>({
        prefix: "papercutAccountCustomerAuthorization/",
      })
      .toArray(),
  papercutAccountManagerAuthorizations: () => (tx) =>
    tx
      .scan<PapercutAccountManagerAuthorization>({
        prefix: "papercutAccountManagerAuthorization/",
      })
      .toArray(),
  managedCustomerIds: (managerId: User["id"]) => async (tx) => {
    const managerAuthorizations = await tx
      .scan<PapercutAccountManagerAuthorization>({
        prefix: "papercutAccountManagerAuthorization/",
      })
      .toArray();

    const managedPapercutAccountIds = managerAuthorizations
      .filter((a) => a.managerId === managerId)
      .map(({ papercutAccountId }) => papercutAccountId);

    const customerAuthorizations = await tx
      .scan<PapercutAccountCustomerAuthorization>({
        prefix: "papercutAccountCustomerAuthorization/",
      })
      .toArray();

    const managedCustomerIds = customerAuthorizations
      .filter((a) => managedPapercutAccountIds.includes(a.papercutAccountId))
      .map(({ customerId }) => customerId);

    return managedCustomerIds;
  },
  rooms: () => (tx) => tx.scan<Room>({ prefix: "room/" }).toArray(),
  room: (roomId: Room["id"]) => (tx) => tx.get<Room>(`room/${roomId}`),
  products: () => (tx) => tx.scan<Product>({ prefix: "product/" }).toArray(),
  product: (productId: Product["id"]) => (tx) =>
    tx.get<Product>(`product/${productId}`),
} satisfies QueryFactory;

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
            const res = await client.api.integrations.papercut.credentials.$put(
              { json },
            );
            if (!res.ok) throw new Error(res.statusText);
          },
        }),
        healthCheckPapercut: () => ({
          mutationKey: ["papercut", "health-check"] as const,
          mutationFn: async () => {
            const res =
              await client.api.integrations.papercut["health-check"].$post();
            if (!res.ok) throw new Error(res.statusText);
          },
        }),
        syncPapercutAccounts: () => ({
          mutationKey: ["papercut", "accounts", "sync"] as const,
          mutationFn: async () => {
            const res = await client.api.integrations.papercut.accounts.$put({
              json: undefined,
            });
            if (!res.ok) throw new Error(res.statusText);
          },
        }),
      }) satisfies MutationOptionsFactory,
    [client],
  );

  return factory;
}
