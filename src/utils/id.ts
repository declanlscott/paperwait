import { customAlphabet } from "nanoid";

import { nanoIdCustomAlphabet, nanoIdLength } from "~/utils/constants";

export const generateId = customAlphabet(nanoIdCustomAlphabet, nanoIdLength);
