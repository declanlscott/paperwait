import {
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  variant,
} from "valibot";

import { method } from ".";

import type { Output as ValiOutput } from "valibot";

export const inputSchema = variant("methodName", [
  object({
    methodName: literal(method.isUserExists),
    input: object({ username: string() }),
  }),
  object({
    methodName: literal(method.listUserSharedAccounts),
    input: object({
      username: string(),
      offset: optional(number(), 0),
      limit: optional(number(), 1000),
      ignoreUserAccountSelectionConfig: optional(boolean(), true),
    }),
  }),
  object({
    methodName: literal(method.adjustSharedAccountAccountBalance),
    input: object({
      username: string(),
      adjustment: number(),
      comment: string(),
    }),
  }),
]);

export type Input = ValiOutput<typeof inputSchema>;
