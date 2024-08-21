import api from "~/api/index";

import type { APIRoute } from "astro";

export const ALL: APIRoute = ({ request }) => api.fetch(request);
