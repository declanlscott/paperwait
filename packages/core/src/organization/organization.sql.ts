import { index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { idPrimaryKey, timestamps } from "../drizzle/columns";

export const Provider = pgEnum("provider", ["entra-id", "google"]);
export type Provider = (typeof Provider.enumValues)[number];

export const OrgStatus = pgEnum("org_status", [
  "initializing",
  "active",
  "suspended",
]);
export type OrgStatus = (typeof OrgStatus.enumValues)[number];

export const Organization = pgTable(
  "organization",
  {
    ...idPrimaryKey,
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    provider: Provider("provider").notNull(),
    providerId: text("provider_id").notNull(),
    status: OrgStatus("status").notNull().default("initializing"),
    ...timestamps,
  },
  (table) => ({
    slugIndex: index("slug_idx").on(table.slug),
    nameIndex: index("name_idx").on(table.name),
    providerIdIndex: index("provider_id_idx").on(table.providerId),
  }),
);
export type Organization = typeof Organization.$inferSelect;
