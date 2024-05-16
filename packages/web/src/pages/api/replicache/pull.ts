// TODO: Finish
/* eslint-disable @typescript-eslint/no-unused-vars */
import { pull } from "@paperwait/core/replicache";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(
      context,
      new Set(["administrator", "technician", "manager", "customer"]),
    );

    const requestBody = await context.request.json();

    const responseBody = await pull(user, requestBody);

    return new Response(JSON.stringify(responseBody), { status: 200 });
  } catch (e) {
    console.error(e);
  }
}
