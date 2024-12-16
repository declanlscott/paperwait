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
import { useSubscribe } from "~/app/lib/hooks/replicache";

import type { BillingAccount } from "@printworks/core/billing-accounts/sql";
import type { Product } from "@printworks/core/products/sql";
import type { Room } from "@printworks/core/rooms/sql";
import type { User } from "@printworks/core/users/sql";
import type { MutationOptionsFactory, QueryFactory } from "~/app/types";

export const useQuery = <TData, TDefaultData = undefined>(
  ...args: Parameters<typeof useSubscribe<TData, TDefaultData>>
) => useSubscribe(...args);

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

export function useMutationOptionsFactory() {
  const api = useApi();

  // TODO
  const factory = useMemo(() => ({}) satisfies MutationOptionsFactory, [api]);

  return factory;
}
