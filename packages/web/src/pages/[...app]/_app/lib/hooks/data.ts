import { useMemo } from "react";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountsTableName,
} from "@printworks/core/billing-accounts/shared";
import { productsTableName } from "@printworks/core/products/shared";
import { Replicache } from "@printworks/core/replicache/client";
import {
  deliveryOptionsTableName,
  roomsTableName,
  workflowStatusesTableName,
} from "@printworks/core/rooms/shared";
import { tenantsTableName } from "@printworks/core/tenants/shared";
import { usersTableName } from "@printworks/core/users/shared";
import * as R from "remeda";

import { useApi } from "~/app/lib/hooks/api";
import { useReplicache, useSubscribe } from "~/app/lib/hooks/replicache";

import type { BillingAccount } from "@printworks/core/billing-accounts/sql";
import type { Product } from "@printworks/core/products/sql";
import type { DeliveryOptions, Workflow } from "@printworks/core/rooms/shared";
import type { Room } from "@printworks/core/rooms/sql";
import type { User } from "@printworks/core/users/sql";
import type { MutationOptionsFactory, QueryFactory } from "~/app/types";

export const useQuery = <TData, TDefaultData = undefined>(
  ...args: Parameters<typeof useSubscribe<TData, TDefaultData>>
) => useSubscribe(...args);

export const queryFactory = {
  billingAccounts: () => (tx) => Replicache.scan(tx, billingAccountsTableName),
  billingAccount: (accountId: BillingAccount["id"]) => (tx) =>
    Replicache.get(tx, billingAccountsTableName, accountId),
  billingAccountCustomerAuthorizations: () => (tx) =>
    Replicache.scan(tx, billingAccountCustomerAuthorizationsTableName),
  billingAccountManagerAuthorizations: () => (tx) =>
    Replicache.scan(tx, billingAccountManagerAuthorizationsTableName),
  deliveryOptions: (roomId: Room["id"]) => async (tx) =>
    Replicache.scan(tx, deliveryOptionsTableName).then((options) =>
      R.pipe(
        options,
        R.filter((option) => option.roomId === roomId),
        R.sortBy(R.prop("index")),
        R.reduce((options, option) => {
          options.push({
            id: option.id,
            description: option.description,
            detailsLabel: option.detailsLabel,
            cost: option.cost,
          });

          return options;
        }, [] as DeliveryOptions),
      ),
    ),
  managedBillingAccountIds: (managerId: User["id"]) => async (tx) =>
    Replicache.scan(tx, billingAccountManagerAuthorizationsTableName).then(
      (authorizations) =>
        R.pipe(
          authorizations,
          R.filter((a) => a.managerId === managerId),
          R.map(R.prop("billingAccountId")),
        ),
    ),
  managedCustomerIds: (managerId: User["id"]) => async (tx) =>
    Replicache.scan(tx, billingAccountManagerAuthorizationsTableName).then(
      (authorizations) =>
        R.pipe(
          authorizations,
          R.filter((a) => a.managerId === managerId),
          R.map(R.prop("billingAccountId")),
          async (managedBillingAccountIds) =>
            Replicache.scan(
              tx,
              billingAccountCustomerAuthorizationsTableName,
            ).then((authorizations) =>
              R.pipe(
                authorizations,
                R.filter((a) =>
                  managedBillingAccountIds.includes(a.billingAccountId),
                ),
                R.map(R.prop("customerId")),
              ),
            ),
        ),
    ),
  products: () => (tx) => Replicache.scan(tx, productsTableName),
  product: (productId: Product["id"]) => (tx) =>
    Replicache.get(tx, productsTableName, productId),
  tenant: () => async (tx) =>
    Replicache.scan(tx, tenantsTableName).then((tenants) => tenants.at(0)),
  rooms: () => (tx) => Replicache.scan(tx, roomsTableName),
  room: (roomId: Room["id"]) => (tx) =>
    Replicache.get(tx, roomsTableName, roomId),
  users: () => (tx) => Replicache.scan(tx, usersTableName),
  user: (userId: User["id"]) => (tx) =>
    Replicache.get(tx, usersTableName, userId),
  workflow: (roomId: Room["id"]) => async (tx) =>
    Replicache.scan(tx, workflowStatusesTableName).then((statuses) =>
      R.pipe(
        statuses,
        R.filter((status) => status.roomId === roomId),
        R.sortBy(R.prop("index")),
        R.reduce((workflow, status) => {
          if (status.type !== "Review")
            workflow.push({
              id: status.id,
              type: status.type,
              color: status.color,
              charging: status.charging,
            });

          return workflow;
        }, [] as Workflow),
      ),
    ),
} satisfies QueryFactory;

export const useMutator = () => useReplicache().client.mutate;

export function useMutationOptionsFactory() {
  const api = useApi();

  // TODO
  const factory = useMemo(() => ({}) satisfies MutationOptionsFactory, [api]);

  return factory;
}
