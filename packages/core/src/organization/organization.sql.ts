import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { id, timestamps } from "../utils/drizzle";
import { generateId } from "../utils/nanoid";

export const provider = pgEnum("provider", ["entra-id", "google"]);
export type Provider = (typeof provider.enumValues)[number];

export const orgStatus = pgEnum("org_status", [
  "initializing",
  "active",
  "suspended",
]);
export type OrgStatus = (typeof orgStatus.enumValues)[number];

export const Organization = pgTable("organization", {
  id: id("id").$defaultFn(generateId).primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  provider: provider("provider").notNull(),
  tenantId: text("tenant_id").notNull(),
  status: orgStatus("status").notNull().default("initializing"),
  ...timestamps,
});
