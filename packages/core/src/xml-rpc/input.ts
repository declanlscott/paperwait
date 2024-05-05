import {
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  variant,
} from "valibot";

import { xmlRpcMethod } from ".";

import type { Output } from "valibot";

export const xmlRpcInputSchema = variant("methodName", [
  object({
    methodName: literal(xmlRpcMethod.isUserExists),
    input: object({ username: string() }),
  }),
  object({
    methodName: literal(xmlRpcMethod.listUserSharedAccounts),
    input: object({
      username: string(),
      offset: optional(number(), 0),
      limit: optional(number(), 1000),
      ignoreUserAccountSelectionConfig: optional(boolean(), true),
    }),
  }),
  object({
    methodName: literal(xmlRpcMethod.adjustSharedAccountAccountBalance),
    input: object({
      username: string(),
      adjustment: number(),
      comment: string(),
    }),
  }),
]);

export type XmlRpcInput = Output<typeof xmlRpcInputSchema>;
