import {
  foreignKey,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { VARCHAR_LENGTH } from "../constants";
import { id, idPrimaryKey, timestamps } from "../drizzle/columns";
import { licenseStatus, orgStatus } from "../drizzle/enums.sql";
import { oauth2ProvidersTable } from "../oauth2/sql";
import { licensesTableName, organizationsTableName } from "./shared";

import type { InferSelectModel } from "drizzle-orm";

export const licensesTable = pgTable(licensesTableName, {
  key: uuid("key").defaultRandom().primaryKey(),
  orgId: id("org_id").references(() => organizationsTable.id),
  status: licenseStatus("status").notNull().default("active"),
});
export type LicensesTable = typeof licensesTable;
export type License = InferSelectModel<LicensesTable>;

export const organizationsTable = pgTable(
  organizationsTableName,
  {
    ...idPrimaryKey,
    slug: varchar("slug", { length: VARCHAR_LENGTH }).notNull().unique(),
    name: varchar("name", { length: VARCHAR_LENGTH }).notNull(),
    status: orgStatus("status").notNull().default("initializing"),
    oauth2ProviderId: text("oauth2_provider_id"),
    ...timestamps,
  },
  (table) => ({
    slugIndex: index("slug_idx").on(table.slug),
    nameIndex: index("name_idx").on(table.name),
    oauth2ProviderReference: foreignKey({
      columns: [table.oauth2ProviderId, table.id],
      foreignColumns: [oauth2ProvidersTable.id, oauth2ProvidersTable.orgId],
      name: "oauth2_provider_fk",
    }),
  }),
);
export type OrganizationsTable = typeof organizationsTable;
export type Organization = InferSelectModel<OrganizationsTable>;
