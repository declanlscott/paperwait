import { relations } from "drizzle-orm";

import { announcements } from "../announcements/sql";
import { sessions } from "../auth/sql";
import { comments } from "../comments/sql";
import { orders } from "../orders/sql";
import { organizations } from "../organizations/sql";
import {
  papercutAccountCustomerAuthorizations,
  papercutAccountManagerAuthorizations,
  papercutAccounts,
} from "../papercut/sql";
import { products } from "../products/sql";
import {
  replicacheClientGroups,
  replicacheClients,
  replicacheClientViews,
} from "../replicache/sql";
import { rooms } from "../rooms/sql";
import { users } from "../users/sql";

export const organizationRelations = relations(organizations, ({ many }) => ({
  user: many(users, { relationName: "userOrg" }),
  papercutAccount: many(papercutAccounts, {
    relationName: "papercutAccountOrg",
  }),
  papercutAccountCustomerAuthorization: many(
    papercutAccountCustomerAuthorizations,
    { relationName: "papercutAccountCustomerAuthorizationOrg" },
  ),
  papercutAccountManagerAuthorization: many(
    papercutAccountManagerAuthorizations,
    { relationName: "papercutAccountManagerAuthorizationOrg" },
  ),
  room: many(rooms, { relationName: "roomOrg" }),
  announcement: many(announcements, { relationName: "announcementOrg" }),
  product: many(products, { relationName: "productOrg" }),
  order: many(orders, { relationName: "orderOrg" }),
  comment: many(comments, { relationName: "commentOrg" }),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId, sessions.orgId],
    references: [users.id, users.orgId],
    relationName: "sessionUser",
  }),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
    relationName: "userOrg",
  }),
  session: many(sessions, { relationName: "sessionUser" }),
  papercutAccountCustomerAuthorization: many(
    papercutAccountCustomerAuthorizations,
    { relationName: "papercutAccountCustomerAuthorizationCustomer" },
  ),
  papercutAccountManagerAuthorization: many(
    papercutAccountManagerAuthorizations,
    { relationName: "papercutAccountManagerAuthorizationManager" },
  ),
  orderCustomer: many(orders, { relationName: "orderCustomer" }),
  orderManager: many(orders, { relationName: "orderManager" }),
  orderOperator: many(orders, { relationName: "orderOperator" }),
  comment: many(comments, { relationName: "commentAuthor" }),
  replicacheClientGroup: many(replicacheClientGroups, {
    relationName: "userReplicacheClientGroup",
  }),
}));

export const papercutAccountRelations = relations(
  papercutAccounts,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [papercutAccounts.orgId],
      references: [organizations.id],
      relationName: "papercutAccountOrg",
    }),
    papercutAccountCustomerAuthorization: many(
      papercutAccountCustomerAuthorizations,
      { relationName: "papercutAccountCustomerAuthorizationPapercutAccount" },
    ),
    papercutAccountManagerAuthorization: many(
      papercutAccountManagerAuthorizations,
      { relationName: "papercutAccountManagerAuthorizationPapercutAccount" },
    ),
    order: many(orders, { relationName: "orderPapercutAccount" }),
  }),
);

export const papercutAccountCustomerAuthorizationRelations = relations(
  papercutAccountCustomerAuthorizations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [papercutAccountCustomerAuthorizations.orgId],
      references: [organizations.id],
      relationName: "papercutAccountCustomerAuthorizationOrg",
    }),
    customer: one(users, {
      fields: [papercutAccountCustomerAuthorizations.customerId],
      references: [users.id],
      relationName: "papercutAccountCustomerAuthorizationCustomer",
    }),
    papercutAccount: one(papercutAccounts, {
      fields: [papercutAccountCustomerAuthorizations.papercutAccountId],
      references: [papercutAccounts.id],
      relationName: "papercutAccountCustomerAuthorizationPapercutAccount",
    }),
  }),
);

export const papercutAccountManagerAuthorizationRelations = relations(
  papercutAccountManagerAuthorizations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [papercutAccountManagerAuthorizations.orgId],
      references: [organizations.id],
      relationName: "papercutAccountManagerAuthorizationOrg",
    }),
    manager: one(users, {
      fields: [papercutAccountManagerAuthorizations.managerId],
      references: [users.id],
      relationName: "papercutAccountManagerAuthorizationManager",
    }),
    papercutAccount: one(papercutAccounts, {
      fields: [papercutAccountManagerAuthorizations.papercutAccountId],
      references: [papercutAccounts.id],
      relationName: "papercutAccountManagerAuthorizationPapercutAccount",
    }),
  }),
);

export const roomRelations = relations(rooms, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [rooms.orgId],
    references: [organizations.id],
    relationName: "roomOrg",
  }),
  announcement: many(announcements, { relationName: "announcementRoom" }),
  product: many(products, { relationName: "productRoom" }),
}));

export const announcementRelations = relations(announcements, ({ one }) => ({
  organization: one(organizations, {
    fields: [announcements.orgId],
    references: [organizations.id],
    relationName: "announcementOrg",
  }),
  room: one(rooms, {
    fields: [announcements.roomId],
    references: [rooms.id],
    relationName: "announcementRoom",
  }),
}));

export const productRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.orgId],
    references: [organizations.id],
    relationName: "productOrg",
  }),
  room: one(rooms, {
    fields: [products.roomId],
    references: [rooms.id],
    relationName: "productRoom",
  }),
  order: many(orders, { relationName: "orderProduct" }),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [orders.orgId],
    references: [organizations.id],
    relationName: "orderOrg",
  }),
  customer: one(users, {
    fields: [orders.customerId, orders.orgId],
    references: [users.id, users.orgId],
    relationName: "orderCustomer",
  }),
  manager: one(users, {
    fields: [orders.managerId],
    references: [users.id],
    relationName: "orderManager",
  }),
  operator: one(users, {
    fields: [orders.operatorId],
    references: [users.id],
    relationName: "orderOperator",
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
    relationName: "orderProduct",
  }),
  papercutAccount: one(papercutAccounts, {
    fields: [orders.papercutAccountId],
    references: [papercutAccounts.id],
    relationName: "orderPapercutAccount",
  }),
  comment: many(comments, { relationName: "commentOrder" }),
}));

export const commentRelations = relations(comments, ({ one }) => ({
  organization: one(organizations, {
    fields: [comments.orgId],
    references: [organizations.id],
    relationName: "commentOrg",
  }),
  order: one(orders, {
    fields: [comments.orderId],
    references: [orders.id],
    relationName: "commentOrder",
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
    relationName: "commentAuthor",
  }),
}));

export const replicacheClientGroupRelations = relations(
  replicacheClientGroups,
  ({ one, many }) => ({
    user: one(users, {
      fields: [replicacheClientGroups.userId, replicacheClientGroups.orgId],
      references: [users.id, users.orgId],
      relationName: "userReplicacheClientGroup",
    }),
    replicacheClient: many(replicacheClients, {
      relationName: "replicacheClientGroup",
    }),
    replicacheClientView: many(replicacheClientViews, {
      relationName: "replicacheCvrGroup",
    }),
  }),
);

export const replicacheClientRelations = relations(
  replicacheClients,
  ({ one }) => ({
    replicacheClientGroup: one(replicacheClientGroups, {
      fields: [replicacheClients.clientGroupId, replicacheClients.orgId],
      references: [replicacheClientGroups.id, replicacheClientGroups.orgId],
      relationName: "replicacheClientGroup",
    }),
  }),
);

export const replicacheClientViewRecordRelations = relations(
  replicacheClientViews,
  ({ one }) => ({
    replicacheClientGroup: one(replicacheClientGroups, {
      fields: [
        replicacheClientViews.clientGroupId,
        replicacheClientViews.orgId,
      ],
      references: [replicacheClientGroups.id, replicacheClientGroups.orgId],
      relationName: "replicacheCvrGroup",
    }),
  }),
);
