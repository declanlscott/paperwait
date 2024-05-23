import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { idPrimaryKey, timestamps } from "../drizzle/columns";

export const provider = pgEnum("provider", ["entra-id", "google"]);
export type Provider = (typeof provider.enumValues)[number];

export const orgStatus = pgEnum("org_status", [
  "initializing",
  "active",
  "suspended",
]);
export type OrgStatus = (typeof orgStatus.enumValues)[number];

export const Organization = pgTable("organization", {
  ...idPrimaryKey,
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  provider: provider("provider").notNull(),
  providerId: text("provider_id").notNull(),
  status: orgStatus("status").notNull().default("initializing"),
  ...timestamps,
});
export type Organization = typeof Organization.$inferSelect;
