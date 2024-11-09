import { useMemo } from "react";
import { enforceRbac } from "@printworks/core/utils/shared";

import { useAuthenticated } from "~/app/lib/hooks/auth";

import type { PropsWithChildren } from "react";
import type { UserRole } from "@printworks/core/users/shared";

export interface EnforceRbac extends PropsWithChildren {
  roles: Array<UserRole>;
}

export function EnforceRbac(props: EnforceRbac) {
  const { user } = useAuthenticated();

  const hasAccess = useMemo(
    () => enforceRbac(user, props.roles),
    [user, props.roles],
  );

  if (!hasAccess) return null;

  return <>{props.children}</>;
}
