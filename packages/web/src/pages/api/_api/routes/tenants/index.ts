import { vValidator } from "@hono/valibot-validator";
import { and, eq } from "@paperwait/core/drizzle/lib";
import { transact } from "@paperwait/core/drizzle/transaction";
import { registrationSchema } from "@paperwait/core/tenants/shared";
import { licensesTable, tenantsTable } from "@paperwait/core/tenants/sql";
import { Hono } from "hono";

export default new Hono().post(
  "/",
  vValidator("form", registrationSchema),
  async (c) => {
    const registration = c.req.valid("form");

    const result = await transact(async (tx) => {
      const tenant = await tx
        .insert(tenantsTable)
        .values({
          slug: registration.tenantSlug,
          name: registration.tenantName,
          oauth2ProviderId: registration.oauth2ProviderId,
        })
        .returning()
        .then((rows) => rows.at(0));
      if (!tenant) throw new Error("Failed to create tenant");

      const { columns } = await tx
        .update(licensesTable)
        .set({ tenantId: tenant.id })
        .where(
          and(
            eq(licensesTable.key, registration.licenseKey),
            eq(licensesTable.status, "active"),
          ),
        );
      if (columns.length === 0)
        throw new Error("Invalid or expired license key");

      return tenant;
    });

    if (result.status === "error") throw result.error;

    return c.redirect(`/tenant/${result.output.slug}`);
  },
);
