import { useAuthenticated } from "@paperwait/core/auth/context";
import { enforceRbac } from "@paperwait/core/auth/rbac";
import { withTransaction } from "@paperwait/core/drizzle/transaction";
import { ForbiddenError } from "@paperwait/core/errors/http";
import * as OAuth2 from "@paperwait/core/oauth2";
import { withOAuth2 } from "@paperwait/core/oauth2/context";
import { createMiddleware } from "hono/factory";

import type { UserRole } from "@paperwait/core/user/shared";

export const authorization = (
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) =>
  createMiddleware(async (_, next) => {
    enforceRbac(useAuthenticated().user, roles, ForbiddenError);
    await next();
  });

export const provider = createMiddleware(async (_, next) =>
  withOAuth2(
    {
      provider: await withTransaction(() =>
        OAuth2.fromSessionId(useAuthenticated().session.id),
      ),
    },
    next,
  ),
);

export const maxContentLength = (
  variant: keyof MaxFileSizes,
  contentLength: number,
) =>
  createMiddleware(async (c, next) => {
    const { org } = useAuthenticated();

    const maxFileSizes = validate(
      MaxFileSizes,
      await getSsmParameter({
        Name: buildSsmParameterPath(org.id, MAX_FILE_SIZES_PARAMETER_NAME),
      }),
      {
        Error: InternalServerError,
        message: "Failed to parse max file sizes",
      },
    );

    validate(
      v.pipe(v.number(), v.minValue(0), v.maxValue(maxFileSizes[variant])),
      contentLength,
      {
        Error: BadRequestError,
        message: "Content length exceeds maximum file size",
      },
    );

    await next();
  });
