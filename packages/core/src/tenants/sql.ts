import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { id, idPrimaryKey, timestamps } from "../drizzle/columns";
import { Constants } from "../utils/constants";
import { licenseStatus, tenantStatus } from "../utils/sql";
import {
  licensesTableName,
  tenantMetadataTableName,
  tenantsTableName,
} from "./shared";

import type { InferSelectModel } from "drizzle-orm";
import type { TenantInfraProgramInput } from "./shared";

export const licensesTable = pgTable(licensesTableName, {
  key: uuid("key").defaultRandom().primaryKey(),
  tenantId: id("tenant_id").unique(),
  status: licenseStatus("status").notNull().default("active"),
});
export type LicensesTable = typeof licensesTable;
export type License = InferSelectModel<LicensesTable>;

export const tenantsTable = pgTable(
  tenantsTableName,
  {
    ...idPrimaryKey,
    slug: varchar("slug", { length: Constants.VARCHAR_LENGTH })
      .notNull()
      .unique(),
    name: varchar("name", { length: Constants.VARCHAR_LENGTH }).notNull(),
    status: tenantStatus("status").notNull().default("initializing"),
    oauth2ProviderId: text("oauth2_provider_id"),
    ...timestamps,
  },
  (table) => [
    index("slug_idx").on(table.slug),
    index("name_idx").on(table.name),
  ],
);
export type TenantsTable = typeof tenantsTable;
export type Tenant = InferSelectModel<TenantsTable>;

export const tenantMetadataTable = pgTable(tenantMetadataTableName, {
  ...idPrimaryKey,
  infraProgramInput: jsonb("infra_program_input")
    .$type<TenantInfraProgramInput>()
    .notNull(),
  tenantId: id("tenant_id").unique().notNull(),
  ...timestamps,
});
export type TenantMetadataTable = typeof tenantMetadataTable;
export type TenantMetadata = InferSelectModel<TenantMetadataTable>;
