import { relations } from "drizzle-orm";
import { bigint, foreignKey, pgTable } from "drizzle-orm/pg-core";

import { Session } from "../auth/session.sql";
import { id } from "../drizzle/columns";
import { Order } from "../order/order.sql";
import { Organization } from "../organization/organization.sql";
import {
  ReplicacheClient,
  ReplicacheClientGroup,
  ReplicacheClientView,
} from "../replicache/replicache.sql";
import { SharedAccount } from "../shared-account/shared-account.sql";
import { User } from "../user/user.sql";

export const CustomerToSharedAccount = pgTable(
  "user_to_shared_account",
  {
    orgId: id("org_id").notNull(),
    customerId: id("customer_id").notNull(),
    sharedAccountId: bigint("shared_account_id", { mode: "number" }).notNull(),
  },
  (table) => ({
    userReference: foreignKey({
      columns: [table.customerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "user_fk",
    }),
    sharedAccountReference: foreignKey({
      columns: [table.sharedAccountId, table.orgId],
      foreignColumns: [SharedAccount.id, SharedAccount.orgId],
      name: "shared_account_fk",
    }),
  }),
);
export type CustomerToSharedAccount =
  typeof CustomerToSharedAccount.$inferSelect;

export const ManagerToSharedAccount = pgTable(
  "manager_to_shared_account",
  {
    orgId: id("org_id").notNull(),
    managerId: id("manager_id").notNull(),
    sharedAccountId: bigint("shared_account_id", { mode: "number" }).notNull(),
  },
  (table) => ({
    managerReference: foreignKey({
      columns: [table.managerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "manager_fk",
    }),
    sharedAccountReference: foreignKey({
      columns: [table.sharedAccountId, table.orgId],
      foreignColumns: [SharedAccount.id, SharedAccount.orgId],
      name: "shared_account_fk",
    }),
  }),
);
export type ManagerToSharedAccount = typeof ManagerToSharedAccount.$inferSelect;

export const organizationRelations = relations(Organization, ({ many }) => ({
  user: many(User, { relationName: "userOrg" }),
  order: many(Order, { relationName: "orderOrg" }),
}));

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
  order: many(Order, { relationName: "orderCustomer" }),
}));

export const sessionRelations = relations(Session, ({ one }) => ({
  user: one(User, {
    fields: [Session.userId, Session.orgId],
    references: [User.id, User.orgId],
    relationName: "userSession",
  }),
}));

export const orderRelations = relations(Order, ({ one }) => ({
  organization: one(Organization, {
    fields: [Order.orgId],
    references: [Organization.id],
    relationName: "orderOrg",
  }),
  customer: one(User, {
    fields: [Order.customerId, Order.orgId],
    references: [User.id, User.orgId],
    relationName: "orderCustomer",
  }),
}));

export const replicacheClientGroupRelations = relations(
  ReplicacheClientGroup,
  ({ one, many }) => ({
    user: one(User, {
      fields: [ReplicacheClientGroup.userId, ReplicacheClientGroup.orgId],
      references: [User.id, User.orgId],
      relationName: "userReplicacheClientGroup",
    }),
    replicacheClient: many(ReplicacheClient, {
      relationName: "replicacheClientGroup",
    }),
    replicacheClientView: many(ReplicacheClientView, {
      relationName: "replicacheCvrGroup",
    }),
  }),
);

export const replicacheClientRelations = relations(
  ReplicacheClient,
  ({ one }) => ({
    replicacheClientGroup: one(ReplicacheClientGroup, {
      fields: [ReplicacheClient.clientGroupId, ReplicacheClient.orgId],
      references: [ReplicacheClientGroup.id, ReplicacheClientGroup.orgId],
      relationName: "replicacheClientGroup",
    }),
  }),
);

export const replicacheClientViewRecordRelations = relations(
  ReplicacheClientView,
  ({ one }) => ({
    replicacheClientGroup: one(ReplicacheClientGroup, {
      fields: [ReplicacheClientView.clientGroupId, ReplicacheClientView.orgId],
      references: [ReplicacheClientGroup.id, ReplicacheClientGroup.orgId],
      relationName: "replicacheCvrGroup",
    }),
  }),
);
