export const AWS_REGION = "us-east-2";

export const LOCALHOST = "localhost:4321";
export const DOMAIN = "paperwait.app";
export const AUTH_REDIRECT_PATH = "/api/auth/entra-id/callback";

export const NANOID_CUSTOM_ALPHABET = "2346789abcdefghijkmnpqrtwxyz";
export const NANOID_LENGTH = 20;

export const DB_SCHEMA_VERSION = 1;
export const DB_TRANSACTION_MAX_RETRIES = 10;
export const POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE = "40001";
export const POSTGRES_DEADLOCK_DETECTED_ERROR_CODE = "40P01";

export const CLIENT_RESOURCE_PREFIX = "Client";
export const ENV_RESOURCE_PREFIX = "SST_RESOURCE_";
export const REALTIME_ENV_KEY = {
  API_KEY: "API_KEY",
  REPLICACHE_LICENSE_KEY: "REPLICACHE_LICENSE_KEY",
} as const;
