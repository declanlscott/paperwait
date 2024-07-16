import api from "~/api/index";

import type { APIRoute } from "astro";
import type { HonoEnv } from "~/api/types";

export const ALL: APIRoute = ({ request, locals }) =>
  api.fetch(request, { locals } satisfies HonoEnv["Bindings"]);
