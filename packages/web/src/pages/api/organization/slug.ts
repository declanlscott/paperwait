import { db } from "@paperwait/core/database";
import { Organization } from "@paperwait/core/organization";
import { eq } from "drizzle-orm";
import { parse, pick } from "valibot";

import { registrationSchema } from "~/lib/schemas";

import type { APIContext } from "astro";
import type { OrgSlugExistence } from "~/lib/schemas";

export const prerender = false;

export async function POST(context: APIContext) {
  const formData = await context.request.formData();
  const { slug } = parse(
    pick(registrationSchema, ["slug"]),
    Object.fromEntries(formData.entries()),
  );

  const [exists] = slug
    ? await db.select({}).from(Organization).where(eq(Organization.slug, slug))
    : [undefined];

  const body = {
    value: slug,
    exists: !!exists,
  } satisfies OrgSlugExistence;

  return new Response(JSON.stringify(body));
}
