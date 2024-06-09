import * as v from "valibot";

import { PAPERCUT_API_PAGINATION_LIMIT } from "../constants";

const BaseEvent = v.object({
  orgId: v.string(),
  input: v.unknown(),
});

const Offset = v.fallback(v.optional(v.pipe(v.number(), v.integer())), 0);
const Limit = v.fallback(
  v.optional(v.pipe(v.number(), v.integer())),
  PAPERCUT_API_PAGINATION_LIMIT,
);

// api.adjustSharedAccountAccountBalance
export const AdjustSharedAccountAccountBalanceInput = v.object({
  sharedAccountName: v.string(),
  adjustment: v.number(),
  comment: v.string(),
});
export type AdjustSharedAccountAccountBalanceInput = v.InferOutput<
  typeof AdjustSharedAccountAccountBalanceInput
>;
export const AdjustSharedAccountAccountBalanceEventRecord = v.object({
  ...BaseEvent.entries,
  ...v.object({
    input: AdjustSharedAccountAccountBalanceInput,
  }).entries,
});
export type AdjustSharedAccountAccountBalanceRecord = v.InferOutput<
  typeof AdjustSharedAccountAccountBalanceEventRecord
>;
export const AdjustSharedAccountAccountBalanceOutput = v.boolean();
export type AdjustSharedAccountAccountBalanceOutput = v.InferOutput<
  typeof AdjustSharedAccountAccountBalanceOutput
>;
export const AdjustSharedAccountAccountBalanceResult = v.object({
  output: AdjustSharedAccountAccountBalanceOutput,
});
export type AdjustSharedAccountAccountBalanceResult = v.InferOutput<
  typeof AdjustSharedAccountAccountBalanceResult
>;

// api.getSharedAccountProperties
export const GetSharedAccountPropertiesInput = v.object({
  sharedAccountName: v.string(),
});
export type GetSharedAccountPropertiesInput = v.InferOutput<
  typeof GetSharedAccountPropertiesInput
>;
export const GetSharedAccountPropertiesEvent = v.object({
  ...BaseEvent.entries,
  ...v.object({
    input: GetSharedAccountPropertiesInput,
  }).entries,
});
export type GetSharedAccountPropertiesEvent = v.InferOutput<
  typeof GetSharedAccountPropertiesEvent
>;
export const GetSharedAccountPropertiesOutput = v.tuple([
  v.string(), // access-groups
  v.string(), // access-users
  v.pipe(
    v.string(),
    v.check((value) => {
      const accountId = JSON.parse(value);

      // Validate that the account id is an integer
      return typeof accountId === "number" && accountId % 1 === 0;
    }),
  ), // account-id
  v.pipe(
    v.string(),
    v.check((value) => typeof JSON.parse(value) === "number"),
  ), // balance
  v.string(), // comment-option
  v.pipe(
    v.string(),
    v.check((value) => typeof JSON.parse(value.toLowerCase()) === "boolean"),
  ), // disabled
  v.string(), // invoice-option
  v.string(), // notes
  v.pipe(
    v.string(),
    v.check((value) => typeof JSON.parse(value) === "number"),
  ), // overdraft-amount
  v.string(), // pin
  v.pipe(
    v.string(),
    v.check((value) => typeof JSON.parse(value.toLowerCase()) === "boolean"),
  ), // restricted
]);
export type GetSharedAccountPropertiesOutput = v.InferOutput<
  typeof GetSharedAccountPropertiesOutput
>;
export const GetSharedAccountPropertiesResult = v.object({
  output: GetSharedAccountPropertiesOutput,
});
export type GetSharedAccountPropertiesResult = v.InferOutput<
  typeof GetSharedAccountPropertiesResult
>;

// api.isUserExists
export const IsUserExistsInput = v.object({
  username: v.string(),
});
export type IsUserExistsInput = v.InferOutput<typeof IsUserExistsInput>;
export const IsUserExistsEvent = v.object({
  ...BaseEvent.entries,
  ...v.object({
    input: IsUserExistsInput,
  }).entries,
});
export type IsUserExistsEvent = v.InferOutput<typeof IsUserExistsEvent>;
export const IsUserExistsOutput = v.boolean();
export type IsUserExistsOutput = v.InferOutput<typeof IsUserExistsOutput>;
export const IsUserExistsResult = v.object({
  output: IsUserExistsOutput,
});
export type IsUserExistsResult = v.InferOutput<typeof IsUserExistsResult>;

// api.listSharedAccounts
export const ListSharedAccountsInput = v.object({
  offset: Offset,
  limit: Limit,
});
export type ListSharedAccountsInput = v.InferOutput<
  typeof ListSharedAccountsInput
>;
export const ListSharedAccountsEvent = v.object({
  ...BaseEvent.entries,
  ...v.object({
    input: ListSharedAccountsInput,
  }).entries,
});
export type ListSharedAccountsEvent = v.InferOutput<
  typeof ListSharedAccountsEvent
>;
export const ListSharedAccountsOutput = v.array(v.string());
export type ListSharedAccountsOutput = v.InferOutput<
  typeof ListSharedAccountsOutput
>;
export const ListSharedAccountsResult = v.object({
  output: ListSharedAccountsOutput,
});
export type ListSharedAccountsResult = v.InferOutput<
  typeof ListSharedAccountsResult
>;

// api.listUserSharedAccounts
export const ListUserSharedAccountsInput = v.object({
  username: v.string(),
  offset: Offset,
  limit: Limit,
  ignoreUserAccountSelectionConfig: v.fallback(v.optional(v.boolean()), true),
});
export type ListUserSharedAccountsInput = v.InferOutput<
  typeof ListUserSharedAccountsInput
>;
export const ListUserSharedAccountsEvent = v.object({
  ...BaseEvent.entries,
  ...v.object({
    input: ListUserSharedAccountsInput,
  }).entries,
});
export type ListUserSharedAccountsEvent = v.InferOutput<
  typeof ListUserSharedAccountsEvent
>;
export const ListUserSharedAccountsOutput = v.array(v.string());
export type ListUserSharedAccountsOutput = v.InferOutput<
  typeof ListUserSharedAccountsOutput
>;
export const ListUserSharedAccountsResult = v.object({
  output: ListUserSharedAccountsOutput,
});
export type ListUserSharedAccountsResult = v.InferOutput<
  typeof ListUserSharedAccountsResult
>;

// Test PaperCut
export const TestPapercutInput = v.object({
  authToken: v.string(),
});
export type TestPapercutInput = v.InferOutput<typeof TestPapercutInput>;
export const TestPapercutEvent = v.object({
  ...BaseEvent.entries,
  ...v.object({
    input: TestPapercutInput,
  }).entries,
});
export type TestPapercutEvent = v.InferOutput<typeof TestPapercutEvent>;
