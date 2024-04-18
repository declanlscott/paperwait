import { customAlphabet } from "nanoid";
import { regex, string } from "valibot";

import { NANOID_CUSTOM_ALPHABET, NANOID_LENGTH } from "../constants";

export const generateId = customAlphabet(NANOID_CUSTOM_ALPHABET, NANOID_LENGTH);

export const nanoIdPattern = new RegExp(
  `^[${NANOID_CUSTOM_ALPHABET}]{${NANOID_LENGTH}}$`,
);

export const nanoIdSchema = string([regex(nanoIdPattern)]);
