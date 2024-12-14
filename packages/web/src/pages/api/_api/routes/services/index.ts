import { Hono } from "hono";

import { authorization } from "~/api/middleware/authorization";
import papercut from "~/api/routes/services/papercut";
import tailscale from "~/api/routes/services/tailscale";

export default new Hono()
  .use(authorization("services", "update"))
  .route("/papercut", papercut)
  .route("/tailscale", tailscale);
