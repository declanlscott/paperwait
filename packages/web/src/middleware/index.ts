import { sequence } from "astro:middleware";

import { auth } from "~/middleware/auth";
import { rateLimitIp, rateLimitUser } from "~/middleware/rate-limit";

export const onRequest = sequence(rateLimitIp, auth, rateLimitUser);
