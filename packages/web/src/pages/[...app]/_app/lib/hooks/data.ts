import { useMemo } from "react";
import {
  papercutAccountCustomerAuthorizationsTableName,
  papercutAccountManagerAuthorizationsTableName,
  papercutAccountsTableName,
} from "@paperwait/core/papercut/shared";
import { productsTableName } from "@paperwait/core/products/shared";
import { roomsTableName } from "@paperwait/core/rooms/shared";
import { tenantsTableName } from "@paperwait/core/tenants/shared";
import { usersTableName } from "@paperwait/core/users/shared";
import * as R from "remeda";

import { useApi } from "~/app/lib/hooks/api";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { useSubscribe } from "~/app/lib/hooks/replicache";

import type {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "@paperwait/core/papercut/sql";
import type { Product } from "@paperwait/core/products/sql";
import type { Room } from "@paperwait/core/rooms/sql";
import type { Tenant } from "@paperwait/core/tenants/sql";
import type { User, UserWithProfile } from "@paperwait/core/users/sql";
import type { MutationOptionsFactory, QueryFactory } from "~/app/types";

export const useQuery = <TData, TDefaultData = undefined>(
  ...params: Parameters<typeof useSubscribe<TData, TDefaultData>>
) => useSubscribe(...params);

export const queryFactory = {
  tenant: () => async (tx) =>
    tx
      .scan<Tenant>({ prefix: `${tenantsTableName}/` })
      .toArray()
      .then((tenants) => tenants.at(0)),
  users: () => (tx) =>
    tx.scan<UserWithProfile>({ prefix: `${usersTableName}/` }).toArray(),
  user: (userId: User["id"]) => (tx) =>
    tx.get<UserWithProfile>(`${usersTableName}/${userId}`),
  papercutAccounts: () => (tx) =>
    tx
      .scan<PapercutAccount>({ prefix: `${papercutAccountsTableName}/` })
      .toArray(),
  papercutAccount: (accountId: PapercutAccount["id"]) => (tx) =>
    tx.get<PapercutAccount>(`${papercutAccountsTableName}/${accountId}`),
  managedPapercutAccountIds: (managerId: User["id"]) => async (tx) =>
    R.pipe(
      await tx
        .scan<PapercutAccountManagerAuthorization>({
          prefix: `${papercutAccountManagerAuthorizationsTableName}/`,
        })
        .toArray(),
      R.filter((a) => a.managerId === managerId),
      R.map(R.prop("papercutAccountId")),
    ),
  papercutAccountCustomerAuthorizations: () => (tx) =>
    tx
      .scan<PapercutAccountCustomerAuthorization>({
        prefix: `${papercutAccountCustomerAuthorizationsTableName}/`,
      })
      .toArray(),
  papercutAccountManagerAuthorizations: () => (tx) =>
    tx
      .scan<PapercutAccountManagerAuthorization>({
        prefix: `${papercutAccountManagerAuthorizationsTableName}/`,
      })
      .toArray(),
  managedCustomerIds: (managerId: User["id"]) => async (tx) =>
    R.pipe(
      await tx
        .scan<PapercutAccountManagerAuthorization>({
          prefix: `${papercutAccountManagerAuthorizationsTableName}/`,
        })
        .toArray(),
      R.filter((a) => a.managerId === managerId),
      R.map(R.prop("papercutAccountId")),
      async (managedPapercutAccountIds) =>
        R.pipe(
          await tx
            .scan<PapercutAccountCustomerAuthorization>({
              prefix: `${papercutAccountCustomerAuthorizationsTableName}/`,
            })
            .toArray(),
          R.filter((a) =>
            managedPapercutAccountIds.includes(a.papercutAccountId),
          ),
          R.map(R.prop("customerId")),
        ),
    ),
  rooms: () => (tx) =>
    tx.scan<Room>({ prefix: `${roomsTableName}/` }).toArray(),
  room: (roomId: Room["id"]) => (tx) =>
    tx.get<Room>(`${roomsTableName}/${roomId}`),
  products: () => (tx) =>
    tx.scan<Product>({ prefix: `${productsTableName}/` }).toArray(),
  product: (productId: Product["id"]) => (tx) =>
    tx.get<Product>(`${productsTableName}/${productId}`),
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
