import { Hono } from "hono";

import papercut from "~/api/routes/integrations/papercut";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>().route("/papercut", papercut);
