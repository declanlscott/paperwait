import { assertRole } from "@paperwait/core/user";

import { useAuthenticated } from "~/app/lib/hooks/auth";

import type { PropsWithChildren } from "react";
import type { UserRole } from "@paperwait/core/user";

export interface AuthorizeProps extends PropsWithChildren {
  roles: UserRole[];
}

export function Authorize({ roles, children }: AuthorizeProps) {
  const { user } = useAuthenticated();

  const hasRole = assertRole(user, roles);

  if (!hasRole) return null;

  return children;
}
