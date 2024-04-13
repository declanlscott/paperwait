import { authorize } from "~/lib/server/auth/authorize";

import type { APIContext } from "astro";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(context);

    const body: unknown = await context.request.json();
  } catch (e) {
    console.error(e);
  }
}
