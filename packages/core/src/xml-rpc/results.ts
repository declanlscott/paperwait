import { array, boolean, object, string } from "valibot";

// api.isUserExists
export const IsUserExistsOutput = boolean();
export const IsUserExistsResultBody = object({
  output: IsUserExistsOutput,
});

// api.listUserSharedAccounts
export const ListUserSharedAccountsOutput = array(string());
export const ListUserSharedAccountsResultBody = object({
  output: ListUserSharedAccountsOutput,
});

// api.adjustSharedAccountAccountBalance
export const AdjustSharedAccountAccountBalanceOutput = boolean();
export const AdjustSharedAccountAccountBalanceResultBody = object({
  output: AdjustSharedAccountAccountBalanceOutput,
});
