import type { SyncedTableName } from "../utils/tables";

export type Resource =
  | SyncedTableName
  | "documents-mime-types"
  | "documents-size-limit"
  | "services";

export type Action = "create" | "update" | "delete";
