import { stringify } from "superjson";

import api from "~/api/index";

import type { APIRoute } from "astro";
import type { Bindings } from "~/api/index";

export const ALL: APIRoute = (context) =>
  api.fetch(context.request, {
    org: stringify(context.locals.org),
    session: stringify(context.locals.session),
    user: stringify(context.locals.user),
  } satisfies Bindings);
