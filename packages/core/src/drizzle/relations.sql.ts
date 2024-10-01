import { relations } from "drizzle-orm";

import { announcementsTable } from "../announcements/sql";
import { sessionsTable } from "../auth/sql";
import { commentsTable } from "../comments/sql";
import { ordersTable } from "../orders/sql";
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
import { tenantsTable } from "../tenants/sql";
import { usersTable } from "../users/sql";

export const tenantRelations = relations(tenantsTable, ({ many }) => ({
  user: many(usersTable, { relationName: "userTenant" }),
  papercutAccount: many(papercutAccountsTable, {
    relationName: "papercutAccountTenant",
  }),
  papercutAccountCustomerAuthorization: many(
    papercutAccountCustomerAuthorizationsTable,
    { relationName: "papercutAccountCustomerAuthorizationTenant" },
  ),
  papercutAccountManagerAuthorization: many(
    papercutAccountManagerAuthorizationsTable,
    { relationName: "papercutAccountManagerAuthorizationTenant" },
  ),
  room: many(roomsTable, { relationName: "roomTenant" }),
  announcement: many(announcementsTable, {
    relationName: "announcementTenant",
  }),
  product: many(productsTable, { relationName: "productTenant" }),
  order: many(ordersTable, { relationName: "orderTenant" }),
  comment: many(commentsTable, { relationName: "commentTenant" }),
}));

export const sessionRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId, sessionsTable.tenantId],
    references: [usersTable.id, usersTable.tenantId],
    relationName: "sessionUser",
  }),
}));

export const userRelations = relations(usersTable, ({ one, many }) => ({
  tenant: one(tenantsTable, {
    fields: [usersTable.tenantId],
    references: [tenantsTable.id],
    relationName: "userTenant",
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
    tenant: one(tenantsTable, {
      fields: [papercutAccountsTable.tenantId],
      references: [tenantsTable.id],
      relationName: "papercutAccountTenant",
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
    tenant: one(tenantsTable, {
      fields: [papercutAccountCustomerAuthorizationsTable.tenantId],
      references: [tenantsTable.id],
      relationName: "papercutAccountCustomerAuthorizationTenant",
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
    tenant: one(tenantsTable, {
      fields: [papercutAccountManagerAuthorizationsTable.tenantId],
      references: [tenantsTable.id],
      relationName: "papercutAccountManagerAuthorizationTenant",
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
  tenant: one(tenantsTable, {
    fields: [roomsTable.tenantId],
    references: [tenantsTable.id],
    relationName: "roomTenant",
  }),
  announcement: many(announcementsTable, { relationName: "announcementRoom" }),
  product: many(productsTable, { relationName: "productRoom" }),
}));

export const announcementRelations = relations(
  announcementsTable,
  ({ one }) => ({
    tenant: one(tenantsTable, {
      fields: [announcementsTable.tenantId],
      references: [tenantsTable.id],
      relationName: "announcementTenant",
    }),
    room: one(roomsTable, {
      fields: [announcementsTable.roomId],
      references: [roomsTable.id],
      relationName: "announcementRoom",
    }),
  }),
);

export const productRelations = relations(productsTable, ({ one, many }) => ({
  tenant: one(tenantsTable, {
    fields: [productsTable.tenantId],
    references: [tenantsTable.id],
    relationName: "productTenant",
  }),
  room: one(roomsTable, {
    fields: [productsTable.roomId],
    references: [roomsTable.id],
    relationName: "productRoom",
  }),
  order: many(ordersTable, { relationName: "orderProduct" }),
}));

export const orderRelations = relations(ordersTable, ({ one, many }) => ({
  tenant: one(tenantsTable, {
    fields: [ordersTable.tenantId],
    references: [tenantsTable.id],
    relationName: "orderTenant",
  }),
  customer: one(usersTable, {
    fields: [ordersTable.customerId, ordersTable.tenantId],
    references: [usersTable.id, usersTable.tenantId],
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
  tenant: one(tenantsTable, {
    fields: [commentsTable.tenantId],
    references: [tenantsTable.id],
    relationName: "commentTenant",
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
        replicacheClientGroupsTable.tenantId,
      ],
      references: [usersTable.id, usersTable.tenantId],
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
        replicacheClientsTable.tenantId,
      ],
      references: [
        replicacheClientGroupsTable.id,
        replicacheClientGroupsTable.tenantId,
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
        replicacheClientViewsTable.tenantId,
      ],
      references: [
        replicacheClientGroupsTable.id,
        replicacheClientGroupsTable.tenantId,
      ],
      relationName: "replicacheCvrGroup",
    }),
  }),
);
