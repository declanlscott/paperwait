import { ApplicationError } from "@printworks/core/utils/errors";
import { getRouteApi } from "@tanstack/react-router";

import { useUserActor } from "~/app/lib/hooks/actor";
import { query, useQuery } from "~/app/lib/hooks/data";

import type { BillingAccount } from "@printworks/core/billing-accounts/sql";
import type { User } from "@printworks/core/users/sql";

const authenticatedRouteApi = getRouteApi("/_authenticated");

export const useUser = () =>
  useQuery(query.user(useUserActor().id), {
    defaultData: authenticatedRouteApi.useLoaderData().initialUser,
  });

export function useManager() {
  const user = useUser();

  if (user.profile.role !== "manager")
    throw new ApplicationError.AccessDenied();

  const billingAccountIds = useQuery(query.managedBillingAccountIds(user.id), {
    defaultData: [] as Array<BillingAccount["id"]>,
  });

  const customerIds = useQuery(query.managedCustomerIds(user.id), {
    defaultData: [] as Array<User["id"]>,
  });

  return { billingAccountIds, customerIds };
}
