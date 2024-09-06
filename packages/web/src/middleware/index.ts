import { sequence } from "astro:middleware";

import { auth } from "~/middleware/auth";

export const onRequest = sequence(auth);
