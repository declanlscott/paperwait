import * as v from "valibot";

import { NANOID_PATTERN } from "../constants";

export const nanoIdSchema = v.pipe(v.string(), v.regex(NANOID_PATTERN));
export type NanoId = v.InferOutput<typeof nanoIdSchema>;

export const timestampsSchema = v.object({
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  deletedAt: v.nullable(v.pipe(v.string(), v.isoTimestamp())),
});

export const orgTableSchema = v.object({
  id: nanoIdSchema,
  orgId: nanoIdSchema,
  ...timestampsSchema.entries,
});

export const papercutAccountIdSchema = v.pipe(
  v.string(),
  v.transform((input) => BigInt(input).toString()),
);
