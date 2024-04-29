// TODO: Finish
/* eslint-disable @typescript-eslint/no-unused-vars */
import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(
      context,
      new Set(["administrator", "technician", "manager", "customer"]),
    );

    const body: unknown = await context.request.json();
  } catch (e) {
    console.error(e);
  }
}
