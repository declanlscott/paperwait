import { assertRole } from "@paperwait/core/user";

import { useAuthed } from "~/app/lib/hooks/auth";

import type { PropsWithChildren } from "react";
import type { UserRole } from "@paperwait/core/user";

export interface AuthorizeProps extends PropsWithChildren {
  roles: UserRole[];
}

export function Authorize({ roles, children }: AuthorizeProps) {
  const { user } = useAuthed();

  if (!assertRole(user, roles)) return null;

  return children;
}
