import { InvalidUserRoleError } from "@paperwait/core/errors";

import { useAuthenticated } from "~/app/lib/hooks/auth";
import { queryFactory, useQuery } from "~/app/lib/hooks/data";

import type { PapercutAccountId } from "@paperwait/core/schemas";
import type { User } from "@paperwait/core/user";

export function useManager() {
  const { user } = useAuthenticated();

  if (user.role !== "manager") throw new InvalidUserRoleError();

  const papercutAccountIds = useQuery(
    queryFactory.managedPapercutAccountIds(user.id),
    { defaultData: [] as Array<PapercutAccountId> },
  );

  const customerIds = useQuery(queryFactory.managedCustomerIds(user.id), {
    defaultData: [] as Array<User["id"]>,
  });

  return { papercutAccountIds, customerIds };
}
