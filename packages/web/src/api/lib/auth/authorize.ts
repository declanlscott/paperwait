import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "@paperwait/core/errors";
import { assertRole } from "@paperwait/core/user";
import { fn } from "@paperwait/core/valibot";

import { BindingsOutput } from "~/api/lib/bindings";

import type { UserRole } from "@paperwait/core/user";
import type { BindingsInput } from "~/api/lib/bindings";

export function authorize(
  bindings: BindingsInput,
  roleSet: Array<UserRole> = [
    "administrator",
    "operator",
    "manager",
    "customer",
  ],
) {
  return fn(
    BindingsOutput,
    ({ user, session }) => {
      if (!session || !user) throw new UnauthorizedError();

      if (!assertRole(user, roleSet, false)) throw new ForbiddenError();

      return { user, session };
    },
    { Error: BadRequestError, message: "Invalid api context bindings" },
  )(bindings);
}
