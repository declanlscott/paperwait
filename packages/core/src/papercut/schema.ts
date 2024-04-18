import { object, string, url } from "valibot";

import type { Output } from "valibot";

export const papercutSchema = object({
  serverUrl: string([url()]),
  authToken: string(),
});
export type Papercut = Output<typeof papercutSchema>;
