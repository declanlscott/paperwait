import { ApplicationError } from "@paperwait/core/utils/errors";

import { useAuthenticated } from "~/app/lib/hooks/auth";
import { queryFactory, useQuery } from "~/app/lib/hooks/data";

import type { PapercutAccount } from "@paperwait/core/papercut/sql";
import type { User } from "@paperwait/core/users/sql";

export function useManager() {
  const { user } = useAuthenticated();

  if (user.profile.role !== "manager")
    throw new ApplicationError.AccessDenied("Manager role required");

  const papercutAccountIds = useQuery(
    queryFactory.managedPapercutAccountIds(user.id),
    { defaultData: [] as Array<PapercutAccount["id"]> },
  );

  const customerIds = useQuery(queryFactory.managedCustomerIds(user.id), {
    defaultData: [] as Array<User["id"]>,
  });

  return { papercutAccountIds, customerIds };
}
