import { db } from "@paperwait/core/database";
import { Organization } from "@paperwait/core/organization";
import { eq } from "drizzle-orm";

export async function isOrgSlugValid(slug: string) {
  return await db
    .select({})
    .from(Organization)
    .where(eq(Organization.slug, slug))
    .execute()
    .then((rows) => rows.length === 0);
}
