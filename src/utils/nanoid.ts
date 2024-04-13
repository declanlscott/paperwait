import { customAlphabet } from "nanoid";

import { NANOID_CUSTOM_ALPHABET, NANOID_LENGTH } from "~/utils/constants";

export const generateId = customAlphabet(NANOID_CUSTOM_ALPHABET, NANOID_LENGTH);
