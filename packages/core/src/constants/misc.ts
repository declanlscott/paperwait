import type { MaxFileSizes } from "../schemas/shared";

export const AWS_REGION = "us-east-2";

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

export const defaultMaxFileSizes = {
  assets: 250 * 1024, // 250 KB
  documents: 10 * 1024 * 1024, // 10 MB
} as const satisfies MaxFileSizes;
