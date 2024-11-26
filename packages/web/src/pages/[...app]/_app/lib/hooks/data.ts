import { useMemo } from "react";
import {
  papercutAccountCustomerAuthorizationsTableName,
  papercutAccountManagerAuthorizationsTableName,
  papercutAccountsTableName,
} from "@printworks/core/papercut/shared";
import { productsTableName } from "@printworks/core/products/shared";
import { Replicache } from "@printworks/core/replicache/client";
import { roomsTableName } from "@printworks/core/rooms/shared";
import { tenantsTableName } from "@printworks/core/tenants/shared";
import { usersTableName } from "@printworks/core/users/shared";
import * as R from "remeda";

import { useApi } from "~/app/lib/hooks/api";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { useSubscribe } from "~/app/lib/hooks/replicache";

import type {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "@printworks/core/papercut/sql";
import type { Product } from "@printworks/core/products/sql";
import type { Room } from "@printworks/core/rooms/sql";
import type { Tenant } from "@printworks/core/tenants/sql";
import type { User, UserWithProfile } from "@printworks/core/users/sql";
import type { MutationOptionsFactory, QueryFactory } from "~/app/types";

export const useQuery = <TData, TDefaultData = undefined>(
  ...params: Parameters<typeof useSubscribe<TData, TDefaultData>>
) => useSubscribe(...params);

export const queryFactory = {
  tenant: () => async (tx) =>
    Replicache.scan<Tenant>(tx, tenantsTableName).then((tenants) =>
      tenants.at(0),
    ),
  users: () => (tx) => Replicache.scan<UserWithProfile>(tx, usersTableName),
  user: (userId: User["id"]) => (tx) =>
    Replicache.get<UserWithProfile>(tx, usersTableName, userId),
  papercutAccounts: () => (tx) =>
    Replicache.scan<PapercutAccount>(tx, papercutAccountsTableName),
  papercutAccount: (accountId: PapercutAccount["id"]) => (tx) =>
    Replicache.get<PapercutAccount>(tx, papercutAccountsTableName, accountId),
  managedPapercutAccountIds: (managerId: User["id"]) => async (tx) =>
    R.pipe(
      await Replicache.scan<PapercutAccountManagerAuthorization>(
        tx,
        papercutAccountManagerAuthorizationsTableName,
      ),
      R.filter((a) => a.managerId === managerId),
      R.map(R.prop("papercutAccountId")),
    ),
  papercutAccountCustomerAuthorizations: () => (tx) =>
    Replicache.scan<PapercutAccountCustomerAuthorization>(
      tx,
      papercutAccountCustomerAuthorizationsTableName,
    ),
  papercutAccountManagerAuthorizations: () => (tx) =>
    Replicache.scan<PapercutAccountManagerAuthorization>(
      tx,
      papercutAccountManagerAuthorizationsTableName,
    ),
  managedCustomerIds: (managerId: User["id"]) => async (tx) =>
    R.pipe(
      await Replicache.scan<PapercutAccountManagerAuthorization>(
        tx,
        papercutAccountManagerAuthorizationsTableName,
      ),
      R.filter((a) => a.managerId === managerId),
      R.map(R.prop("papercutAccountId")),
      async (managedPapercutAccountIds) =>
        R.pipe(
          await Replicache.scan<PapercutAccountCustomerAuthorization>(
            tx,
            papercutAccountCustomerAuthorizationsTableName,
          ),
          R.filter((a) =>
            managedPapercutAccountIds.includes(a.papercutAccountId),
          ),
          R.map(R.prop("customerId")),
        ),
    ),
  rooms: () => (tx) => Replicache.scan<Room>(tx, roomsTableName),
  room: (roomId: Room["id"]) => (tx) =>
    Replicache.get<Room>(tx, roomsTableName, roomId),
  products: () => (tx) => Replicache.scan<Product>(tx, productsTableName),
  product: (productId: Product["id"]) => (tx) =>
    Replicache.get<Product>(tx, productsTableName, productId),
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
