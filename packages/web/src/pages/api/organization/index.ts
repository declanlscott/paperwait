import { db } from "@paperwait/core/database";
import { DatabaseError, NotImplementedError } from "@paperwait/core/errors";
import { Organization, provider } from "@paperwait/core/organization";
import {
  literal,
  minLength,
  object,
  parse,
  string,
  union,
  uuid,
  ValiError,
} from "valibot";

import type { APIContext } from "astro";

export const prerender = false;

const registrationSchema = object({
  fullName: string([minLength(1)]),
  shortName: string([minLength(1)]),
  ssoProvider: union(provider.enumValues.map((value) => literal(value))),
  tenantId: string([uuid()]),
});

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
        name: registration.fullName,
        slug: registration.shortName,
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
    if (e instanceof NotImplementedError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
