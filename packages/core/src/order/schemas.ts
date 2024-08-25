import * as v from "valibot";

import {
  nanoIdSchema,
  orgTableSchema,
  papercutAccountIdSchema,
} from "../utils/schemas";

export const orderSchema = v.object({
  ...orgTableSchema.entries,
  customerId: nanoIdSchema,
  managerId: v.nullable(nanoIdSchema),
  operatorId: v.nullable(nanoIdSchema),
  productId: nanoIdSchema,
  papercutAccountId: papercutAccountIdSchema,
});
