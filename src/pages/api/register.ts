import { NeonDbError } from "@neondatabase/serverless";
import { z } from "astro/zod";

import { db } from "~/lib/db";
import { Organization } from "~/lib/db/schema";

import type { APIContext } from "astro";

export const prerender = false;

const registrationSchema = z.object({
  fullName: z.string().min(1),
  shortName: z.string().min(1),
  ssoProvider: z.union([z.literal("entra-id"), z.literal("google")]),
  tenantId: z.string().uuid(),
  adminEmail: z.string().email(),
});

export async function POST(context: APIContext) {
  try {
    const formData = await context.request.formData();
    const registration = registrationSchema.parse(
      Object.fromEntries(formData.entries()),
    );

    await db.insert(Organization).values({
      name: registration.fullName,
      slug: registration.shortName,
      provider: registration.ssoProvider,
      tenantId: registration.tenantId,
      adminEmail: registration.adminEmail,
    });

    return context.redirect("/login");
  } catch (e) {
    console.error(e);

    if (e instanceof z.ZodError)
      return new Response(e.message, { status: 400 });
    if (e instanceof NeonDbError)
      return new Response(e.message, { status: 500 });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
