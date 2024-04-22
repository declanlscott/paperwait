import { db } from "@paperwait/core/database";
import {
  DatabaseError,
  HTTPError,
  NotImplementedError,
} from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { parse, ValiError } from "valibot";

import { registrationSchema } from "~/lib/schemas";

import type { APIContext } from "astro";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const formData = await context.request.formData();
    const registration = parse(
      registrationSchema,
      Object.fromEntries(formData.entries()),
    );

    if (registration.ssoProvider === "google") {
      throw new NotImplementedError("Google SSO is not yet implemented");
    }

    const [org] = await db
      .insert(Organization)
      .values({
        name: registration.name,
        slug: registration.slug,
        provider: registration.ssoProvider,
        tenantId: registration.tenantId,
      })
      .returning({ slug: Organization.slug });

    return context.redirect(
      `/api/auth/${registration.ssoProvider}/login?org=${encodeURIComponent(org.slug)}`,
    );
  } catch (e) {
    console.error(e);

    if (e instanceof ValiError) return new Response(e.message, { status: 400 });
    if (e instanceof HTTPError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
