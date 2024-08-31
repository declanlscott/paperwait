import { vValidator } from "@hono/valibot-validator";
import { NotImplementedError } from "@paperwait/core/errors/http";
import { useOAuth2 } from "@paperwait/core/oauth2/context";
import * as EntraId from "@paperwait/core/oauth2/entra-id";
import * as Google from "@paperwait/core/oauth2/google";
import { ENTRA_ID, GOOGLE } from "@paperwait/core/oauth2/shared";
import { nanoIdSchema } from "@paperwait/core/utils/schemas";
import { Hono } from "hono";
import * as v from "valibot";

import { authorization, provider } from "~/api/middleware";

export default new Hono()
  .use(authorization())
  .use(provider)
  .get(
    "/:id/photo",
    vValidator("param", v.object({ id: nanoIdSchema })),
    async (c) => {
      const userId = c.req.valid("param").id;
      const oAuth2 = useOAuth2();

      let res: Response;
      switch (oAuth2.provider.variant) {
        case ENTRA_ID:
          res = await EntraId.photo(userId);
          break;
        case GOOGLE:
          res = await Google.photo(userId);
          break;
        default: {
          oAuth2.provider.variant satisfies never;

          throw new NotImplementedError(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider variant "${oAuth2.provider.variant}" not implemented`,
          );
        }
      }

      const contentType = res.headers.get("Content-Type");

      return c.body(res.body, {
        status: res.status,
        headers: {
          ...(contentType ? { "Content-type": contentType } : undefined),
          "Cache-Control": "max-age=2592000",
        },
      });
    },
  );
