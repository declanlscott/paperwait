import { customAlphabet } from "nanoid";
import * as v from "valibot";

import { NANOID_CUSTOM_ALPHABET, NANOID_LENGTH } from "../constants";

export const generateId = customAlphabet(NANOID_CUSTOM_ALPHABET, NANOID_LENGTH);

export const nanoIdPattern = new RegExp(
  `^[${NANOID_CUSTOM_ALPHABET}]{${NANOID_LENGTH}}$`,
);

export const NanoId = v.pipe(v.string(), v.regex(nanoIdPattern));
export type NanoId = v.InferOutput<typeof NanoId>;

export const PapercutAccountId = v.pipe(v.number(), v.integer());
export type PapercutAccountId = v.InferOutput<typeof PapercutAccountId>;
