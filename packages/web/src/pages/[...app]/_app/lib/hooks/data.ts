import { useMemo } from "react";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountsTableName,
} from "@printworks/core/billing-accounts/shared";
import { productsTableName } from "@printworks/core/products/shared";
import { Replicache } from "@printworks/core/replicache/client";
import { roomsTableName } from "@printworks/core/rooms/shared";
import { tenantsTableName } from "@printworks/core/tenants/shared";
import { usersTableName } from "@printworks/core/users/shared";
import * as R from "remeda";

import { useApi } from "~/app/lib/hooks/api";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { useSubscribe } from "~/app/lib/hooks/replicache";

import type { BillingAccount } from "@printworks/core/billing-accounts/sql";
import type { Product } from "@printworks/core/products/sql";
import type { Room } from "@printworks/core/rooms/sql";
import type { User } from "@printworks/core/users/sql";
import type { MutationOptionsFactory, QueryFactory } from "~/app/types";

export const useQuery = <TData, TDefaultData = undefined>(
  ...params: Parameters<typeof useSubscribe<TData, TDefaultData>>
) => useSubscribe(...params);

export const queryFactory = {
  tenant: () => async (tx) =>
    Replicache.scan(tx, tenantsTableName).then((tenants) => tenants.at(0)),
  users: () => (tx) => Replicache.scan(tx, usersTableName),
  user: (userId: User["id"]) => (tx) =>
    Replicache.get(tx, usersTableName, userId),
  billingAccounts: () => (tx) => Replicache.scan(tx, billingAccountsTableName),
  billingAccount: (accountId: BillingAccount["id"]) => (tx) =>
    Replicache.get(tx, billingAccountsTableName, accountId),
  managedBillingAccountIds: (managerId: User["id"]) => async (tx) =>
    R.pipe(
      await Replicache.scan(tx, billingAccountManagerAuthorizationsTableName),
      R.filter((a) => a.managerId === managerId),
      R.map(R.prop("billingAccountId")),
    ),
  billingAccountCustomerAuthorizations: () => (tx) =>
    Replicache.scan(tx, billingAccountCustomerAuthorizationsTableName),
  billingAccountManagerAuthorizations: () => (tx) =>
    Replicache.scan(tx, billingAccountManagerAuthorizationsTableName),
  managedCustomerIds: (managerId: User["id"]) => async (tx) =>
    R.pipe(
      await Replicache.scan(tx, billingAccountManagerAuthorizationsTableName),
      R.filter((a) => a.managerId === managerId),
      R.map(R.prop("billingAccountId")),
      async (managedBillingAccountIds) =>
        R.pipe(
          await Replicache.scan(
            tx,
            billingAccountCustomerAuthorizationsTableName,
          ),
          R.filter((a) =>
            managedBillingAccountIds.includes(a.billingAccountId),
          ),
          R.map(R.prop("customerId")),
        ),
    ),
  rooms: () => (tx) => Replicache.scan(tx, roomsTableName),
  room: (roomId: Room["id"]) => (tx) =>
    Replicache.get(tx, roomsTableName, roomId),
  products: () => (tx) => Replicache.scan(tx, productsTableName),
  product: (productId: Product["id"]) => (tx) =>
    Replicache.get(tx, productsTableName, productId),
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
