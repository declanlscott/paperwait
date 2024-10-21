import { withTransaction } from "@paperwait/core/drizzle/transaction";
import { Oauth2 } from "@paperwait/core/oauth2";
import { withOauth2 } from "@paperwait/core/oauth2/context";
import { useAuthenticated } from "@paperwait/core/sessions/context";
import { HttpError } from "@paperwait/core/utils/errors";
import { enforceRbac } from "@paperwait/core/utils/shared";
import { createMiddleware } from "hono/factory";

import type { UserRole } from "@paperwait/core/users/shared";

export const authorization = (
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) =>
  createMiddleware(async (_, next) => {
    enforceRbac(useAuthenticated().user, roles, {
      Error: HttpError.Forbidden,
      args: [],
    });
    await next();
  });

export const provider = createMiddleware(async (_, next) =>
  withOauth2(
    {
      provider: await withTransaction(() =>
        Oauth2.fromSessionId(useAuthenticated().session.id).catch(
          (error: Error): never => {
            console.error(error);

            if (error instanceof Oauth2.RequestError)
              throw new HttpError.InternalServerError(error.message);
            if (error instanceof Oauth2.RequestError)
              throw new HttpError.InternalServerError(error.message);
            if (error instanceof Error)
              throw new HttpError.InternalServerError(error.message);

            throw new HttpError.InternalServerError(
              "An unexpected error occurred",
            );
          },
        ),
      ),
    },
    next,
  ),
);

// export const maxContentLength = (
//   variant: keyof MaxFileSizes,
//   contentLength: number,
// ) =>
//   createMiddleware(async (c, next) => {
//     const { tenant } = useAuthenticated();

//     const maxFileSizes = validate(
//       MaxFileSizes,
//       await getSsmParameter({
//         Name: buildSsmParameterPath(tenant.id, MAX_FILE_SIZES_PARAMETER_NAME),
//       }),
//       {
//         Error: InternalServerError,
//         message: "Failed to parse max file sizes",
//       },
//     );

//     validate(
//       v.pipe(v.number(), v.minValue(0), v.maxValue(maxFileSizes[variant])),
//       contentLength,
//       {
//         Error: BadRequestError,
//         message: "Content length exceeds maximum file size",
//       },
//     );

//     await next();
//   });
