import { db } from "@paperwait/core/database";
import { BadRequestError } from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { validate } from "@paperwait/core/valibot";
import { eq } from "drizzle-orm";
import { pick } from "valibot";

import { Registration } from "~/lib/schemas";

import type { APIContext } from "astro";
import type { IsOrgSlugValid } from "~/lib/schemas";

export async function POST(context: APIContext) {
  const formData = await context.request.formData();

  try {
    const { slug } = validate(
      pick(Registration, ["slug"]),
      Object.fromEntries(formData.entries()),
      { Error: BadRequestError },
    );

    const [exists] = await db
      .select({})
      .from(Organization)
      .where(eq(Organization.slug, slug));

    return new Response(
      JSON.stringify({
        value: slug,
        isValid: !exists,
      } satisfies IsOrgSlugValid),
    );
  } catch (e) {
    console.error(e);

    if (e instanceof BadRequestError)
      return new Response(
        JSON.stringify({
          value: formData.get("slug")?.toString() ?? "",
          isValid: false,
        } satisfies IsOrgSlugValid),
      );

    return new Response("Internal server error", { status: 500 });
  }
}
