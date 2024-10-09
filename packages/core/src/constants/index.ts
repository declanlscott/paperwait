import type { Duration } from "date-fns";

export const DB_SCHEMA_VERSION = 1;
export const DB_TRANSACTION_MAX_RETRIES = 10;
export const POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE = "40001";
export const POSTGRES_DEADLOCK_DETECTED_ERROR_CODE = "40P01";

export const ROW_VERSION_COLUMN_NAME = "xmin";

export const VARCHAR_LENGTH = 40;

export const AUTH_CALLBACK_PATH = "/api/auth/callback";

export const PAPERCUT_API_PAGINATION_LIMIT = 1000;
export const PAPERCUT_API_TIMEOUT_MS = 8000;

export const POKE = "poke";

export const PAPERCUT_PARAMETER_NAME = "papercut";
export const MAX_FILE_SIZES_PARAMETER_NAME = "max-file-sizes";
export const DOCUMENTS_MIME_TYPES_PARAMETER_NAME = "documents-mime-types";

export const ASSETS_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/gif",
] as const;

export const DEFAULT_DOCUMENTS_MIME_TYPES = ["application/pdf"] as const;

export const NANOID_CUSTOM_ALPHABET = "2346789abcdefghijkmnpqrtwxyz";
export const NANOID_LENGTH = 20;
export const NANOID_PATTERN = new RegExp(
  `^[${NANOID_CUSTOM_ALPHABET}]{${NANOID_LENGTH}}$`,
);

export const TENANT_SLUG_PATTERN = new RegExp(/^[a-zA-Z0-9-]+$/);

export const SESSION_COOKIE_NAME = "auth_session";

export const SESSION_EXPIRATION_DURATION = {
  days: 30,
} as const satisfies Duration;

export const REPLICACHE_EXPIRATION_DURATION = {
  weeks: 2,
} as const satisfies Duration;
