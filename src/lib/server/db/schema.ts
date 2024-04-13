import { relations } from "drizzle-orm";
import {
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { generateId } from "~/utils/nanoid";

export const userRole = pgEnum("user_role", [
  "admin",
  "technician",
  "manager",
  "customer",
]);
export type UserRole = (typeof userRole.enumValues)[number];

export const User = pgTable("user", {
  id: text("id").$defaultFn(generateId).primaryKey(),
  providerId: text("provider_id").notNull().unique(),
  orgId: text("org_id")
    .notNull()
    .references(() => Organization.id),
  role: userRole("role").notNull().default("customer"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

export const provider = pgEnum("provider", ["entra-id", "google"]);
export type Provider = (typeof provider.enumValues)[number];

export const orgStatus = pgEnum("org_status", [
  "initializing",
  "active",
  "suspended",
]);
export type OrgStatus = (typeof orgStatus.enumValues)[number];

export const Organization = pgTable("organization", {
  id: text("id").$defaultFn(generateId).primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  provider: provider("provider").notNull(),
  tenantId: text("tenant_id").notNull(),
  status: orgStatus("status").notNull().default("initializing"),
});

export const Session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => User.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const ReplicacheMeta = pgTable("replicache_meta", {
  key: text("key").primaryKey(),
  value: json("value").notNull(),
});

export const ReplicacheClientGroup = pgTable("replicache_client_group", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => User.id),
  cvrVersion: integer("cvr_version").notNull(),
  lastModified: timestamp("last_modified").notNull(),
});

export const ReplicacheClient = pgTable("replicache_client", {
  id: text("id").primaryKey(),
  clientGroupId: text("client_group_id")
    .notNull()
    .references(() => ReplicacheClientGroup.id),
  lastMutationId: integer("last_mutation_id").notNull(),
  lastModified: timestamp("last_modified").notNull(),
});

export const ReplicacheClientViewRecord = pgTable(
  "replicache_cvr",
  {
    id: integer("id").notNull(),
    clientGroupId: text("client_group_id")
      .notNull()
      .references(() => ReplicacheClientGroup.id),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.id, table.clientGroupId] }),
  }),
);

export const userRelations = relations(User, ({ one, many }) => ({
  organization: one(Organization, {
    fields: [User.orgId],
    references: [Organization.id],
    relationName: "userOrg",
  }),
  session: many(Session, { relationName: "userSession" }),
  replicacheClientGroup: many(ReplicacheClientGroup, {
    relationName: "userReplicacheClientGroup",
  }),
}));

export const organizationRelations = relations(Organization, ({ many }) => ({
  user: many(User, { relationName: "userOrg" }),
}));

export const sessionRelations = relations(Session, ({ one }) => ({
  user: one(User, {
    fields: [Session.userId],
    references: [User.id],
    relationName: "userSession",
  }),
}));

export const replicacheClientGroupRelations = relations(
  ReplicacheClientGroup,
  ({ one, many }) => ({
    user: one(User, {
      fields: [ReplicacheClientGroup.userId],
      references: [User.id],
      relationName: "userReplicacheClientGroup",
    }),
    replicacheClient: many(ReplicacheClient, {
      relationName: "replicacheClientGroup",
    }),
    replicacheClientViewRecord: many(ReplicacheClientViewRecord, {
      relationName: "replicacheCvrGroup",
    }),
  }),
);

export const replicacheClientRelations = relations(
  ReplicacheClient,
  ({ one }) => ({
    replicacheClientGroup: one(ReplicacheClientGroup, {
      fields: [ReplicacheClient.clientGroupId],
      references: [ReplicacheClientGroup.id],
      relationName: "replicacheClientGroup",
    }),
  }),
);

export const replicacheClientViewRecordRelations = relations(
  ReplicacheClientViewRecord,
  ({ one }) => ({
    replicacheClientGroup: one(ReplicacheClientGroup, {
      fields: [ReplicacheClientViewRecord.clientGroupId],
      references: [ReplicacheClientGroup.id],
      relationName: "replicacheCvrGroup",
    }),
  }),
);
