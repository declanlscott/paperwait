import { relations } from "drizzle-orm";

import { announcementsTable } from "../announcements/sql";
import { sessionsTable } from "../auth/sql";
import { commentsTable } from "../comments/sql";
import { ordersTable } from "../orders/sql";
import { organizationsTable } from "../organizations/sql";
import {
  papercutAccountCustomerAuthorizationsTable,
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { productsTable } from "../products/sql";
import {
  replicacheClientGroupsTable,
  replicacheClientsTable,
  replicacheClientViewsTable,
} from "../replicache/sql";
import { roomsTable } from "../rooms/sql";
import { usersTable } from "../users/sql";

export const organizationRelations = relations(
  organizationsTable,
  ({ many }) => ({
    user: many(usersTable, { relationName: "userOrg" }),
    papercutAccount: many(papercutAccountsTable, {
      relationName: "papercutAccountOrg",
    }),
    papercutAccountCustomerAuthorization: many(
      papercutAccountCustomerAuthorizationsTable,
      { relationName: "papercutAccountCustomerAuthorizationOrg" },
    ),
    papercutAccountManagerAuthorization: many(
      papercutAccountManagerAuthorizationsTable,
      { relationName: "papercutAccountManagerAuthorizationOrg" },
    ),
    room: many(roomsTable, { relationName: "roomOrg" }),
    announcement: many(announcementsTable, { relationName: "announcementOrg" }),
    product: many(productsTable, { relationName: "productOrg" }),
    order: many(ordersTable, { relationName: "orderOrg" }),
    comment: many(commentsTable, { relationName: "commentOrg" }),
  }),
);

export const sessionRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId, sessionsTable.orgId],
    references: [usersTable.id, usersTable.orgId],
    relationName: "sessionUser",
  }),
}));

export const userRelations = relations(usersTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [usersTable.orgId],
    references: [organizationsTable.id],
    relationName: "userOrg",
  }),
  session: many(sessionsTable, { relationName: "sessionUser" }),
  papercutAccountCustomerAuthorization: many(
    papercutAccountCustomerAuthorizationsTable,
    { relationName: "papercutAccountCustomerAuthorizationCustomer" },
  ),
  papercutAccountManagerAuthorization: many(
    papercutAccountManagerAuthorizationsTable,
    { relationName: "papercutAccountManagerAuthorizationManager" },
  ),
  orderCustomer: many(ordersTable, { relationName: "orderCustomer" }),
  orderManager: many(ordersTable, { relationName: "orderManager" }),
  orderOperator: many(ordersTable, { relationName: "orderOperator" }),
  comment: many(commentsTable, { relationName: "commentAuthor" }),
  replicacheClientGroup: many(replicacheClientGroupsTable, {
    relationName: "userReplicacheClientGroup",
  }),
}));

export const papercutAccountRelations = relations(
  papercutAccountsTable,
  ({ one, many }) => ({
    organization: one(organizationsTable, {
      fields: [papercutAccountsTable.orgId],
      references: [organizationsTable.id],
      relationName: "papercutAccountOrg",
    }),
    papercutAccountCustomerAuthorization: many(
      papercutAccountCustomerAuthorizationsTable,
      { relationName: "papercutAccountCustomerAuthorizationPapercutAccount" },
    ),
    papercutAccountManagerAuthorization: many(
      papercutAccountManagerAuthorizationsTable,
      { relationName: "papercutAccountManagerAuthorizationPapercutAccount" },
    ),
    order: many(ordersTable, { relationName: "orderPapercutAccount" }),
  }),
);

export const papercutAccountCustomerAuthorizationRelations = relations(
  papercutAccountCustomerAuthorizationsTable,
  ({ one }) => ({
    organization: one(organizationsTable, {
      fields: [papercutAccountCustomerAuthorizationsTable.orgId],
      references: [organizationsTable.id],
      relationName: "papercutAccountCustomerAuthorizationOrg",
    }),
    customer: one(usersTable, {
      fields: [papercutAccountCustomerAuthorizationsTable.customerId],
      references: [usersTable.id],
      relationName: "papercutAccountCustomerAuthorizationCustomer",
    }),
    papercutAccount: one(papercutAccountsTable, {
      fields: [papercutAccountCustomerAuthorizationsTable.papercutAccountId],
      references: [papercutAccountsTable.id],
      relationName: "papercutAccountCustomerAuthorizationPapercutAccount",
    }),
  }),
);

export const papercutAccountManagerAuthorizationRelations = relations(
  papercutAccountManagerAuthorizationsTable,
  ({ one }) => ({
    organization: one(organizationsTable, {
      fields: [papercutAccountManagerAuthorizationsTable.orgId],
      references: [organizationsTable.id],
      relationName: "papercutAccountManagerAuthorizationOrg",
    }),
    manager: one(usersTable, {
      fields: [papercutAccountManagerAuthorizationsTable.managerId],
      references: [usersTable.id],
      relationName: "papercutAccountManagerAuthorizationManager",
    }),
    papercutAccount: one(papercutAccountsTable, {
      fields: [papercutAccountManagerAuthorizationsTable.papercutAccountId],
      references: [papercutAccountsTable.id],
      relationName: "papercutAccountManagerAuthorizationPapercutAccount",
    }),
  }),
);

export const roomRelations = relations(roomsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [roomsTable.orgId],
    references: [organizationsTable.id],
    relationName: "roomOrg",
  }),
  announcement: many(announcementsTable, { relationName: "announcementRoom" }),
  product: many(productsTable, { relationName: "productRoom" }),
}));

export const announcementRelations = relations(
  announcementsTable,
  ({ one }) => ({
    organization: one(organizationsTable, {
      fields: [announcementsTable.orgId],
      references: [organizationsTable.id],
      relationName: "announcementOrg",
    }),
    room: one(roomsTable, {
      fields: [announcementsTable.roomId],
      references: [roomsTable.id],
      relationName: "announcementRoom",
    }),
  }),
);

export const productRelations = relations(productsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [productsTable.orgId],
    references: [organizationsTable.id],
    relationName: "productOrg",
  }),
  room: one(roomsTable, {
    fields: [productsTable.roomId],
    references: [roomsTable.id],
    relationName: "productRoom",
  }),
  order: many(ordersTable, { relationName: "orderProduct" }),
}));

export const orderRelations = relations(ordersTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [ordersTable.orgId],
    references: [organizationsTable.id],
    relationName: "orderOrg",
  }),
  customer: one(usersTable, {
    fields: [ordersTable.customerId, ordersTable.orgId],
    references: [usersTable.id, usersTable.orgId],
    relationName: "orderCustomer",
  }),
  manager: one(usersTable, {
    fields: [ordersTable.managerId],
    references: [usersTable.id],
    relationName: "orderManager",
  }),
  operator: one(usersTable, {
    fields: [ordersTable.operatorId],
    references: [usersTable.id],
    relationName: "orderOperator",
  }),
  product: one(productsTable, {
    fields: [ordersTable.productId],
    references: [productsTable.id],
    relationName: "orderProduct",
  }),
  papercutAccount: one(papercutAccountsTable, {
    fields: [ordersTable.papercutAccountId],
    references: [papercutAccountsTable.id],
    relationName: "orderPapercutAccount",
  }),
  comment: many(commentsTable, { relationName: "commentOrder" }),
}));

export const commentRelations = relations(commentsTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [commentsTable.orgId],
    references: [organizationsTable.id],
    relationName: "commentOrg",
  }),
  order: one(ordersTable, {
    fields: [commentsTable.orderId],
    references: [ordersTable.id],
    relationName: "commentOrder",
  }),
  author: one(usersTable, {
    fields: [commentsTable.authorId],
    references: [usersTable.id],
    relationName: "commentAuthor",
  }),
}));

export const replicacheClientGroupRelations = relations(
  replicacheClientGroupsTable,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [
        replicacheClientGroupsTable.userId,
        replicacheClientGroupsTable.orgId,
      ],
      references: [usersTable.id, usersTable.orgId],
      relationName: "userReplicacheClientGroup",
    }),
    replicacheClient: many(replicacheClientsTable, {
      relationName: "replicacheClientGroup",
    }),
    replicacheClientView: many(replicacheClientViewsTable, {
      relationName: "replicacheCvrGroup",
    }),
  }),
);

export const replicacheClientRelations = relations(
  replicacheClientsTable,
  ({ one }) => ({
    replicacheClientGroup: one(replicacheClientGroupsTable, {
      fields: [
        replicacheClientsTable.clientGroupId,
        replicacheClientsTable.orgId,
      ],
      references: [
        replicacheClientGroupsTable.id,
        replicacheClientGroupsTable.orgId,
      ],
      relationName: "replicacheClientGroup",
    }),
  }),
);

export const replicacheClientViewRecordRelations = relations(
  replicacheClientViewsTable,
  ({ one }) => ({
    replicacheClientGroup: one(replicacheClientGroupsTable, {
      fields: [
        replicacheClientViewsTable.clientGroupId,
        replicacheClientViewsTable.orgId,
      ],
      references: [
        replicacheClientGroupsTable.id,
        replicacheClientGroupsTable.orgId,
      ],
      relationName: "replicacheCvrGroup",
    }),
  }),
);
