import { db } from "@paperwait/core/database";
import { Organization } from "@paperwait/core/organization";
import { eq } from "drizzle-orm";
import { pick, safeParse } from "valibot";

import { registrationSchema } from "~/lib/schemas";

import type { APIContext } from "astro";
import type { OrgSlugValidity } from "~/lib/schemas";

export const prerender = false;

export async function POST(context: APIContext) {
  const formData = await context.request.formData();
  const result = safeParse(
    pick(registrationSchema, ["slug"]),
    Object.fromEntries(formData.entries()),
  );

  if (!result.success) {
    return new Response(
      JSON.stringify({
        value: formData.get("slug")?.toString() ?? "",
        isValid: false,
      } satisfies OrgSlugValidity),
    );
  }

  const [exists] = await db
    .select({})
    .from(Organization)
    .where(eq(Organization.slug, result.output.slug));

  return new Response(
    JSON.stringify({
      value: result.output.slug,
      isValid: !exists,
    } satisfies OrgSlugValidity),
  );
}
