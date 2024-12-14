import { vValidator } from "@hono/valibot-validator";
import { createClient } from "@openauthjs/openauth/client";
import { oauth2ProvidersTable } from "@printworks/core/auth/sql";
import { useTransaction } from "@printworks/core/drizzle/context";
import { tenantsTable } from "@printworks/core/tenants/sql";
import { Constants } from "@printworks/core/utils/constants";
import { HttpError } from "@printworks/core/utils/errors";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { and, eq, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import * as v from "valibot";

export default new Hono<{
  Variables: {
    client: (tenantId: string) => ReturnType<typeof createClient>;
    redirectUri: (tenantId: string) => string;
  };
}>()
  .use((c, next) => {
    c.set("client", (tenantId) =>
      createClient({ clientID: ["web", tenantId].join(":") }),
    );

    c.set("redirectUri", (tenantId) => {
      const redirectUri = new URL("/callback", new URL(c.req.url).origin);
      redirectUri.searchParams.set("tenantId", tenantId);

      return redirectUri.toString();
    });

    return next();
  })
  .get(
    "/authorize",
    vValidator("query", v.object({ tenant: v.string() })),
    async (c) => {
      const tenant = await useTransaction((tx) =>
        tx
          .select({
            id: tenantsTable.id,
            oauth2ProviderId: oauth2ProvidersTable.id,
            oauth2ProviderType: oauth2ProvidersTable.type,
          })
          .from(tenantsTable)
          .where(
            or(
              eq(
                sql`TRIM(LOWER(${tenantsTable.name}))`,
                sql`TRIM(LOWER(${c.req.valid("query").tenant}))`,
              ),
              eq(
                sql`TRIM(LOWER(${tenantsTable.slug}))`,
                sql`TRIM(LOWER(${c.req.valid("query").tenant}))`,
              ),
            ),
          )
          .innerJoin(
            oauth2ProvidersTable,
            and(
              eq(tenantsTable.oauth2ProviderId, oauth2ProvidersTable.id),
              eq(tenantsTable.id, oauth2ProvidersTable.tenantId),
            ),
          )
          .then((rows) => rows.at(0)),
      );
      if (!tenant) throw new HttpError.NotFound("tenant not found");
      if (tenant.oauth2ProviderType === Constants.GOOGLE)
        throw new HttpError.NotImplemented(
          `"${Constants.GOOGLE}" oauth2 provider not yet implemented`,
        );

      const authorizer = c
        .get("client")(tenant.id)
        .authorize(c.get("redirectUri")(tenant.id), "code", {
          provider: tenant.oauth2ProviderType,
        });

      return c.redirect(authorizer, 302);
    },
  )
  .get(
    "/callback",
    vValidator("query", v.object({ tenantId: nanoIdSchema, code: v.string() })),
    async (c) => {
      const tenantId = c.req.valid("query").tenantId;

      const tokens = await c
        .get("client")(tenantId)
        .exchange(c.req.valid("query").code, c.get("redirectUri")(tenantId));

      for (const key in tokens)
        setCookie(c, `${key}_token`, tokens[key as keyof typeof tokens], {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 31449600, // 1 year
        });

      return c.redirect("/", 302);
    },
  );
