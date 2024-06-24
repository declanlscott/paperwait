import * as v from "valibot";

export const PapercutParameter = v.object({
  serverUrl: v.pipe(v.string(), v.url()),
  authToken: v.pipe(v.string(), v.trim(), v.minLength(1)),
});
export type PapercutParameter = v.InferOutput<typeof PapercutParameter>;
