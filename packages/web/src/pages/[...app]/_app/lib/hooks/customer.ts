import { useAuthenticated } from "~/app/lib/hooks/auth";
import { queryFactory, useQuery } from "~/app/lib/hooks/data";

import type { User } from "@printworks/core/users/sql";

export function useCustomer(customerId: User["id"]) {
  const { user } = useAuthenticated();

  const customer = useQuery(queryFactory.user(customerId));

  return null;
}
