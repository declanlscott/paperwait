import { literal, object, string, union, variant } from "valibot";

import { xmlRpcInputSchema, xmlRpcOutputSchema } from ".";
import { nanoIdSchema } from "../utils";

import type { Output } from "valibot";

export const xmlRpcEventSchema = object({
  orgId: nanoIdSchema,
  xmlRpc: xmlRpcInputSchema,
});
export type XmlRpcEvent = Output<typeof xmlRpcEventSchema>;

export const xmlRpcResultSchema = variant("isSuccess", [
  object({
    isSuccess: literal(true),
    value: union(
      xmlRpcOutputSchema.options.map((option) => option.entries.value),
    ),
  }),
  object({ isSuccess: literal(false), reason: string() }),
]);
export type XmlRpcResult = Output<typeof xmlRpcResultSchema>;
