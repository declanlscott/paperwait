import { Hono } from "hono";

import { authorization } from "~/api/middleware";
import papercut from "~/api/routes/integrations/papercut";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .use(authorization())
  .route("/papercut", papercut);
