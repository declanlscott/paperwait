import * as v from "valibot";

import {
  nanoIdSchema,
  orgTableSchema,
  papercutAccountIdSchema,
  timestampsSchema,
} from "../utils/schemas";

export const papercutAccountSchema = v.object({
  id: papercutAccountIdSchema,
  orgId: nanoIdSchema,
  name: v.string(),
  ...timestampsSchema.entries,
});

export const papercutAccountCustomerAuthorizationSchema = v.object({
  ...orgTableSchema.entries,
  customerId: nanoIdSchema,
  papercutAccountId: papercutAccountIdSchema,
});

export const papercutAccountManagerAuthorizationSchema = v.object({
  ...orgTableSchema.entries,
  managerId: nanoIdSchema,
  papercutAccountId: papercutAccountIdSchema,
});
