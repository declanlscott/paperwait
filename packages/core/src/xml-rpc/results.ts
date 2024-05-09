import { array, boolean, object, string } from "valibot";

// api.isUserExists
export const isUserExistsOutputSchema = boolean();
export const isUserExistsResultBodySchema = object({
  output: isUserExistsOutputSchema,
});

// api.listUserSharedAccounts
export const listUserSharedAccountsOutputSchema = array(string());
export const listUserSharedAccountsResultBodySchema = object({
  output: listUserSharedAccountsOutputSchema,
});

// api.adjustSharedAccountAccountBalance
export const adjustSharedAccountAccountBalanceOutputSchema = boolean();
export const adjustSharedAccountAccountBalanceResultBodySchema = object({
  output: adjustSharedAccountAccountBalanceOutputSchema,
});
