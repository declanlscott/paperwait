import { Hono } from "hono";

import { authz } from "~/api/middleware/auth";
import papercut from "~/api/routes/services/papercut";
import tailscale from "~/api/routes/services/tailscale";

export default new Hono()
  .use(authz("services", "update"))
  .route("/papercut", papercut)
  .route("/tailscale", tailscale);
