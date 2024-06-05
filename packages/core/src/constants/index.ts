import { createPrefixedRecord } from "../utils";

export const AWS_REGION = "us-east-2";

export const AUTH_CALLBACK_PATH = "/api/auth/callback";

export const NANOID_CUSTOM_ALPHABET = "2346789abcdefghijkmnpqrtwxyz";
export const NANOID_LENGTH = 20;

export const DB_SCHEMA_VERSION = 1;
export const DB_TRANSACTION_MAX_RETRIES = 10;
export const POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE = "40001";
export const POSTGRES_DEADLOCK_DETECTED_ERROR_CODE = "40P01";

export const CLIENT_RESOURCE_PREFIX = "Client";

export const COMPOSITE_KEY_DELIMITER = ":";

export const xmlRpcMethod = createPrefixedRecord("api.", [
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

export const PAPERCUT_API_PAGINATION_LIMIT = 1000;
export const PAPERCUT_API_TIMEOUT_MS = 8000;
