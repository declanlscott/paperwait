import { createPrefixedRecord } from "../utils/misc";

export const xmlRpcMethod = createPrefixedRecord("api", ".", [
  "adjustSharedAccountAccountBalance",
  "getSharedAccountProperties",
  "isUserExists",
  "listSharedAccounts",
  "listUserSharedAccounts",
]);
export const getSharedAccountPropertiesOutputIndex = {
  accessGroups: 0,
  accessUsers: 1,
  accountId: 2,
  balance: 3,
  commentOption: 4,
  disabled: 5,
  invoiceOption: 6,
  notes: 7,
  overdraftAmount: 8,
  pin: 9,
  restricted: 10,
} as const;
