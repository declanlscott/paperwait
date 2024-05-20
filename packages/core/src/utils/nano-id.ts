import { customAlphabet } from "nanoid";
import { regex, string } from "valibot";

import { NANOID_CUSTOM_ALPHABET, NANOID_LENGTH } from "../constants";

import type { Output } from "valibot";

export const generateId = customAlphabet(NANOID_CUSTOM_ALPHABET, NANOID_LENGTH);

export const nanoIdPattern = new RegExp(
  `^[${NANOID_CUSTOM_ALPHABET}]{${NANOID_LENGTH}}$`,
);

export const NanoId = string([regex(nanoIdPattern)]);
export type NanoId = Output<typeof NanoId>;
