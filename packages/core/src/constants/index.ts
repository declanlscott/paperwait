export const AWS_REGION = "us-east-2";

export const HOST = {
  WEB: {
    DEV: "localhost:4321",
    PROD: "paperwait.app",
  },
  REALTIME: {
    DEV: "localhost:1999",
    PROD: "paperwait-realtime.declanlscott.partykit.dev",
  },
} as const;

export const AUTH_CALLBACK_PATH = "/api/auth/callback";

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
