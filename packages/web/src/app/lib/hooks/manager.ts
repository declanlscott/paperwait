import { InvalidUserRoleError } from "@paperwait/core/errors";

import { useAuthenticated } from "~/app/lib/hooks/auth";
import { queryFactory, useQuery } from "~/app/lib/hooks/data";

export function useManager() {
  const { user } = useAuthenticated();

  if (user.role !== "manager") throw new InvalidUserRoleError();

  const papercutAccountIds =
    useQuery(queryFactory.managedPapercutAccountIds(user.id)) ?? [];

  const customerIds = useQuery(queryFactory.managedCustomerIds(user.id)) ?? [];

  return { papercutAccountIds, customerIds };
}
