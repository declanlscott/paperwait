import { minLength, object, string, toTrimmed, url } from "valibot";

import type { Output } from "valibot";

export const PapercutParameter = object({
  serverUrl: string([url()]),
  authToken: string([toTrimmed(), minLength(1)]),
});
export type PapercutParameter = Output<typeof PapercutParameter>;
