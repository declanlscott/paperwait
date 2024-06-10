import api from "~/api/index";

import type { APIRoute } from "astro";
import type { Env } from "hono";
import type { BindingsInput } from "~/api/lib/bindings";

export const ALL: APIRoute = (context) =>
  api.fetch(context.request, {
    Bindings: {
      org: JSON.stringify(context.locals.org),
      session: JSON.stringify(context.locals.session),
      user: JSON.stringify(context.locals.user),
    } satisfies BindingsInput,
  } satisfies Env);
