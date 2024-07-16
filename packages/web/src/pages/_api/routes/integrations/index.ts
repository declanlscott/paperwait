import { Hono } from "hono";

import papercut from "~/api/routes/integrations/papercut";

import type { HonoParameters } from "~/api/types";

export default new Hono<HonoParameters>().route("/papercut", papercut);
