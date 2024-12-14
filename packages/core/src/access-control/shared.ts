import type { SyncedTableName } from "../utils/tables";

export type Resource = SyncedTableName | "services";

export type Action = "create" | "update" | "delete";
