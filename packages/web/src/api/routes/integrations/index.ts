import { Hono } from "hono";

import papercut from "~/api/routes/integrations/papercut";

export default new Hono().route("/papercut", papercut);
