import { Hono } from "hono";

import { authorization } from "~/api/middleware";
import assets from "~/api/routes/files/assets";
import documents from "~/api/routes/files/documents";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .use(authorization())
  .route("/assets", assets)
  .route("/documents", documents);
