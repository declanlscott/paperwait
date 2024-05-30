import {
  array,
  boolean,
  fallback,
  integer,
  merge,
  number,
  object,
  optional,
  string,
  transform,
  tuple,
  unknown,
} from "valibot";

import type { Output } from "valibot";

const BaseEvent = object({
  orgId: string(),
  input: unknown(),
});

const Offset = fallback(optional(number([integer()])), 0);
const Limit = fallback(optional(number([integer()])), 1000);

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
export const IsUserExistsResultBody = object({
  output: IsUserExistsOutput,
});

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
export const ListUserSharedAccountsResultBody = object({
  output: ListUserSharedAccountsOutput,
});

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
export const GetSharedAccountPropertiesOutput = transform(
  tuple([
    string(), // access-groups
    string(), // access-users
    number([integer()]), // account-id
    number(), // balance
    string(), // comment-option
    boolean(), // disabled
    string(), // invoice-option
    string(), // notes
    number(), // overdraft-amount
    string(), // pin
    boolean(), // restricted
  ]),
  ([
    accessGroups,
    accessUsers,
    accountId,
    balance,
    commentOption,
    disabled,
    invoiceOption,
    notes,
    overdraftAmount,
    pin,
    restricted,
  ]) => ({
    output: {
      accessGroups,
      accessUsers,
      accountId,
      balance,
      commentOption,
      disabled,
      invoiceOption,
      notes,
      overdraftAmount,
      pin,
      restricted,
    },
  }),
);
export const GetSharedAccountPropertiesResultBody = object({
  output: GetSharedAccountPropertiesOutput,
});

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
export const ListSharedAccountsResultBody = object({
  output: ListSharedAccountsOutput,
});

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
export const AdjustSharedAccountAccountBalanceResultBody = object({
  output: AdjustSharedAccountAccountBalanceOutput,
});
