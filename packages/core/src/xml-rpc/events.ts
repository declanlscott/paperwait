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

const BaseEvent = object({
  orgId: string(),
  input: unknown(),
});

// api.isUserExists
export const IsUserExistsInput = object({
  username: string(),
});
export type IsUserExistsInput = Output<typeof IsUserExistsInput>;
export const IsUserExistsEventBody = merge([
  BaseEvent,
  object({ input: IsUserExistsInput }),
]);
export type IsUserExistsEventBody = Output<typeof IsUserExistsEventBody>;

// api.listUserSharedAccounts
export const ListUserSharedAccountsInput = object({
  username: string(),
  offset: fallback(number([integer()]), 0),
  limit: fallback(number([integer()]), 1000),
  ignoreUserAccountSelectionConfig: fallback(boolean(), true),
});
export type ListUserSharedAccountsInput = Output<
  typeof ListUserSharedAccountsInput
>;
export const ListUserSharedAccountsEvent = merge([
  BaseEvent,
  object({ input: ListUserSharedAccountsInput }),
]);
export type ListUserSharedAccountsEvent = Output<
  typeof ListUserSharedAccountsEvent
>;

// api.adjustSharedAccountAccountBalance
export const AdjustSharedAccountAccountBalanceInput = object({
  sharedAccountName: string(),
  adjustment: number(),
  comment: string(),
});
export type AdjustSharedAccountAccountBalanceInput = Output<
  typeof AdjustSharedAccountAccountBalanceInput
>;
export const AdjustSharedAccountAccountBalanceEventRecord = merge([
  BaseEvent,
  object({ input: AdjustSharedAccountAccountBalanceInput }),
]);
export type AdjustSharedAccountAccountBalanceRecord = Output<
  typeof AdjustSharedAccountAccountBalanceEventRecord
>;
