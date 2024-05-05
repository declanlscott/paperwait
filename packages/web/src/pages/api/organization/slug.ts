import { db } from "@paperwait/core/database";
import { BadRequestError } from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { parseSchema } from "@paperwait/core/utils";
import { eq } from "drizzle-orm";
import { pick } from "valibot";

import { registrationSchema } from "~/lib/schemas";

import type { APIContext } from "astro";
import type { OrgSlugValidity } from "~/lib/schemas";

export async function POST(context: APIContext) {
  const formData = await context.request.formData();

  try {
    const { slug } = parseSchema(
      pick(registrationSchema, ["slug"]),
      Object.fromEntries(formData.entries()),
      { className: BadRequestError },
    );

    const [exists] = await db
      .select({})
      .from(Organization)
      .where(eq(Organization.slug, slug));

    return new Response(
      JSON.stringify({
        value: slug,
        isValid: !exists,
      } satisfies OrgSlugValidity),
    );
  } catch (e) {
    console.error(e);

    if (e instanceof BadRequestError)
      return new Response(
        JSON.stringify({
          value: formData.get("slug")?.toString() ?? "",
          isValid: false,
        } satisfies OrgSlugValidity),
      );

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
