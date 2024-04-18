import { customAlphabet } from "nanoid";
import { regex, string } from "valibot";

import { NANOID_CUSTOM_ALPHABET, NANOID_LENGTH } from "../constants";

export const generateId = customAlphabet(NANOID_CUSTOM_ALPHABET, NANOID_LENGTH);

export const pattern = new RegExp(
  `^[${NANOID_CUSTOM_ALPHABET}]{${NANOID_LENGTH}}$`,
);

export const schema = string([regex(pattern)]);
