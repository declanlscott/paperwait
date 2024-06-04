import {
  array,
  boolean,
  custom,
  fallback,
  integer,
  merge,
  number,
  object,
  optional,
  string,
  tuple,
  unknown,
} from "valibot";

import { PAPERCUT_API_PAGINATION_LIMIT } from "../constants";

import type { Output } from "valibot";

const BaseEvent = object({
  orgId: string(),
  input: unknown(),
});

const Offset = fallback(optional(number([integer()])), 0);
const Limit = fallback(
  optional(number([integer()])),
  PAPERCUT_API_PAGINATION_LIMIT,
);

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
export const AdjustSharedAccountAccountBalanceOutput = boolean();
export type AdjustSharedAccountAccountBalanceOutput = Output<
  typeof AdjustSharedAccountAccountBalanceOutput
>;
export const AdjustSharedAccountAccountBalanceResult = object({
  output: AdjustSharedAccountAccountBalanceOutput,
});
export type AdjustSharedAccountAccountBalanceResult = Output<
  typeof AdjustSharedAccountAccountBalanceResult
>;

// api.getSharedAccountProperties
export const GetSharedAccountPropertiesInput = object({
  sharedAccountName: string(),
});
export type GetSharedAccountPropertiesInput = Output<
  typeof GetSharedAccountPropertiesInput
>;
export const GetSharedAccountPropertiesEvent = merge([
  BaseEvent,
  object({ input: GetSharedAccountPropertiesInput }),
]);
export type GetSharedAccountPropertiesEvent = Output<
  typeof GetSharedAccountPropertiesEvent
>;
export const GetSharedAccountPropertiesOutput = tuple([
  string(), // access-groups
  string(), // access-users
  string([
    custom((value) => {
      const accountId = JSON.parse(value);

      // Validate that the account id is an integer
      return typeof accountId === "number" && accountId % 1 === 0;
    }),
  ]), // account-id
  string([custom((value) => typeof JSON.parse(value) === "number")]), // balance
  string(), // comment-option
  string([
    custom((value) => typeof JSON.parse(value.toLowerCase()) === "boolean"),
  ]), // disabled
  string(), // invoice-option
  string(), // notes
  string([custom((value) => typeof JSON.parse(value) === "number")]), // overdraft-amount
  string(), // pin
  string([
    custom((value) => typeof JSON.parse(value.toLowerCase()) === "boolean"),
  ]), // restricted
]);
export type GetSharedAccountPropertiesOutput = Output<
  typeof GetSharedAccountPropertiesOutput
>;
export const GetSharedAccountPropertiesResult = object({
  output: GetSharedAccountPropertiesOutput,
});
export type GetSharedAccountPropertiesResult = Output<
  typeof GetSharedAccountPropertiesResult
>;

// api.isUserExists
export const IsUserExistsInput = object({
  username: string(),
});
export type IsUserExistsInput = Output<typeof IsUserExistsInput>;
export const IsUserExistsEvent = merge([
  BaseEvent,
  object({ input: IsUserExistsInput }),
]);
export type IsUserExistsEvent = Output<typeof IsUserExistsEvent>;
export const IsUserExistsOutput = boolean();
export type IsUserExistsOutput = Output<typeof IsUserExistsOutput>;
export const IsUserExistsResult = object({
  output: IsUserExistsOutput,
});
export type IsUserExistsResult = Output<typeof IsUserExistsResult>;

// api.listSharedAccounts
export const ListSharedAccountsInput = object({
  offset: Offset,
  limit: Limit,
});
export type ListSharedAccountsInput = Output<typeof ListSharedAccountsInput>;
export const ListSharedAccountsEvent = merge([
  BaseEvent,
  object({ input: ListSharedAccountsInput }),
]);
export type ListSharedAccountsEvent = Output<typeof ListSharedAccountsEvent>;
export const ListSharedAccountsOutput = array(string());
export type ListSharedAccountsOutput = Output<typeof ListSharedAccountsOutput>;
export const ListSharedAccountsResult = object({
  output: ListSharedAccountsOutput,
});
export type ListSharedAccountsResult = Output<typeof ListSharedAccountsResult>;

// api.listUserSharedAccounts
export const ListUserSharedAccountsInput = object({
  username: string(),
  offset: Offset,
  limit: Limit,
  ignoreUserAccountSelectionConfig: fallback(optional(boolean()), true),
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
export const ListUserSharedAccountsOutput = array(string());
export type ListUserSharedAccountsOutput = Output<
  typeof ListUserSharedAccountsOutput
>;
export const ListUserSharedAccountsResult = object({
  output: ListUserSharedAccountsOutput,
});
export type ListUserSharedAccountsResult = Output<
  typeof ListUserSharedAccountsResult
>;
