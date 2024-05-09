import {
  boolean,
  fallback,
  integer,
  merge,
  number,
  object,
  string,
  unknown,
} from "valibot";

import type { Output } from "valibot";

const baseEventSchema = object({
  orgId: string(),
  input: unknown(),
});

// api.isUserExists
export const isUserExistsInputSchema = object({
  username: string(),
});
export type IsUserExistsInput = Output<typeof isUserExistsInputSchema>;
export const isUserExistsEventBodySchema = merge([
  baseEventSchema,
  object({ input: isUserExistsInputSchema }),
]);
export type IsUserExistsEventBody = Output<typeof isUserExistsEventBodySchema>;

// api.listUserSharedAccounts
export const listUserSharedAccountsInputSchema = object({
  username: string(),
  offset: fallback(number([integer()]), 0),
  limit: fallback(number([integer()]), 1000),
  ignoreUserAccountSelectionConfig: fallback(boolean(), true),
});
export type ListUserSharedAccountsInput = Output<
  typeof listUserSharedAccountsInputSchema
>;
export const listUserSharedAccountsEventSchema = merge([
  baseEventSchema,
  object({ input: listUserSharedAccountsInputSchema }),
]);
export type ListUserSharedAccountsEvent = Output<
  typeof listUserSharedAccountsEventSchema
>;

// api.adjustSharedAccountAccountBalance
export const adjustSharedAccountAccountBalanceInputSchema = object({
  sharedAccountName: string(),
  adjustment: number(),
  comment: string(),
});
export type AdjustSharedAccountAccountBalanceInput = Output<
  typeof adjustSharedAccountAccountBalanceInputSchema
>;
export const adjustSharedAccountAccountBalanceEventRecordSchema = merge([
  baseEventSchema,
  object({ input: adjustSharedAccountAccountBalanceInputSchema }),
]);
export type AdjustSharedAccountAccountBalanceRecord = Output<
  typeof adjustSharedAccountAccountBalanceEventRecordSchema
>;
