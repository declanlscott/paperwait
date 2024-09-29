import { vValidator } from "@hono/valibot-validator";
import { and, eq } from "@paperwait/core/drizzle";
import { transact } from "@paperwait/core/drizzle/transaction";
import { registrationSchema } from "@paperwait/core/organizations/shared";
import {
  licensesTable,
  organizationsTable,
} from "@paperwait/core/organizations/sql";
import { Hono } from "hono";

export default new Hono().post(
  "/",
  vValidator("form", registrationSchema),
  async (c) => {
    const registration = c.req.valid("form");

    const result = await transact(async (tx) => {
      const org = await tx
        .insert(organizationsTable)
        .values({
          slug: registration.orgSlug,
          name: registration.orgName,
          oauth2ProviderId: registration.oauth2ProviderId,
        })
        .returning()
        .then((rows) => rows.at(0));
      if (!org) throw new Error("Failed to create organization");

      const { columns } = await tx
        .update(licensesTable)
        .set({ orgId: org.id })
        .where(
          and(
            eq(licensesTable.key, registration.licenseKey),
            eq(licensesTable.status, "active"),
          ),
        );
      if (columns.length === 0)
        throw new Error("Invalid or expired license key");

      return org;
    });

    if (result.status === "error") throw result.error;

    return c.redirect(`/org/${result.output.slug}`);
  },
);
