import { array, boolean, literal, object, string, variant } from "valibot";

import { method } from ".";

import type { Output as ValiOutput } from "valibot";

export const outputSchema = variant("methodName", [
  object({ methodName: literal(method.isUserExists), value: boolean() }),
  object({
    methodName: literal(method.listUserSharedAccounts),
    value: array(string()),
  }),
  object({
    methodName: literal(method.adjustSharedAccountAccountBalance),
    value: boolean(),
  }),
]);

export type Output = ValiOutput<typeof outputSchema>;
