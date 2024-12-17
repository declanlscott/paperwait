import { Replicache } from "@printworks/core/replicache/client";
import { usersTableName } from "@printworks/core/users/shared";
import { ApplicationError } from "@printworks/core/utils/errors";

import { useUserActor } from "~/app/lib/hooks/actor";
import { queryFactory, useQuery } from "~/app/lib/hooks/data";

import type { BillingAccount } from "@printworks/core/billing-accounts/sql";
import type { User } from "@printworks/core/users/sql";

export function useUser() {
  const { id } = useUserActor();

  const user = useQuery((tx) => Replicache.get(tx, usersTableName, id));
  if (!user)
    throw new ApplicationError.EntityNotFound({ name: usersTableName, id });

  return user;
}

export function useManager() {
  const user = useUser();

  if (user.profile.role !== "manager")
    throw new ApplicationError.AccessDenied();

  const billingAccountIds = useQuery(
    queryFactory.managedBillingAccountIds(user.id),
    { defaultData: [] as Array<BillingAccount["id"]> },
  );

  const customerIds = useQuery(queryFactory.managedCustomerIds(user.id), {
    defaultData: [] as Array<User["id"]>,
  });

  return { billingAccountIds, customerIds };
}
