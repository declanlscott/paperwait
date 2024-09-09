import { Hono } from "hono";

import { authorization } from "~/api/middleware";
import papercut from "~/api/routes/integrations/papercut";

export default new Hono().use(authorization()).route("/papercut", papercut);
