import { db } from "@paperwait/core/database";
import { Organization } from "@paperwait/core/organization";
import { eq } from "drizzle-orm";

import type { OrgSlug } from "@paperwait/core/schemas";

export async function isOrgSlugValid(slug: OrgSlug) {
  return await db
    .select({})
    .from(Organization)
    .where(eq(Organization.slug, slug))
    .execute()
    .then((rows) => rows.length === 0);
}
