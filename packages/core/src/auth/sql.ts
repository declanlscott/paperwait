import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";

import { id, timestamps } from "../drizzle/columns";
import { oauth2ProviderType } from "../utils/sql";
import { oauth2ProvidersTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const oauth2ProvidersTable = pgTable(
  oauth2ProvidersTableName,
  {
    id: text("id").notNull(),
    tenantId: id("tenant_id").notNull(),
    type: oauth2ProviderType("type").notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.id, table.tenantId] })],
);

export type Oauth2ProvidersTable = typeof oauth2ProvidersTable;

export type Oauth2Provider = InferSelectModel<Oauth2ProvidersTable>;
