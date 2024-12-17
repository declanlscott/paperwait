import { ApplicationError } from "@printworks/core/utils/errors";

import { queryFactory, useQuery } from "~/app/lib/hooks/data";
import { useUser } from "~/app/lib/hooks/user";

import type { BillingAccount } from "@printworks/core/billing-accounts/sql";
import type { User } from "@printworks/core/users/sql";

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
