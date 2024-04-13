import { z } from "astro/zod";

export const schema = z.object({
  serverUrl: z.string().url(),
  authToken: z.string(),
});
