import { relations } from "drizzle-orm";

import { Announcement } from "../announcement/announcement.sql";
import { Session } from "../auth/session.sql";
import { Comment } from "../comment/comment.sql";
import { Order } from "../order/order.sql";
import { Organization } from "../organization/organization.sql";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import {
  ReplicacheClient,
  ReplicacheClientGroup,
  ReplicacheClientView,
} from "../replicache/replicache.sql";
import { Room } from "../room/room.sql";
import { User } from "../user/user.sql";

export const organizationRelations = relations(Organization, ({ many }) => ({
  user: many(User, { relationName: "userOrg" }),
  papercutAccount: many(PapercutAccount, {
    relationName: "papercutAccountOrg",
  }),
  papercutAccountCustomerAuthorization: many(
    PapercutAccountCustomerAuthorization,
    { relationName: "papercutAccountCustomerAuthorizationOrg" },
  ),
  papercutAccountManagerAuthorization: many(
    PapercutAccountManagerAuthorization,
    { relationName: "papercutAccountManagerAuthorizationOrg" },
  ),
  room: many(Room, { relationName: "roomOrg" }),
  announcement: many(Announcement, { relationName: "announcementOrg" }),
  product: many(Product, { relationName: "productOrg" }),
  order: many(Order, { relationName: "orderOrg" }),
  comment: many(Comment, { relationName: "commentOrg" }),
}));

export const sessionRelations = relations(Session, ({ one }) => ({
  user: one(User, {
    fields: [Session.userId, Session.orgId],
    references: [User.id, User.orgId],
    relationName: "sessionUser",
  }),
}));

export const userRelations = relations(User, ({ one, many }) => ({
  organization: one(Organization, {
    fields: [User.orgId],
    references: [Organization.id],
    relationName: "userOrg",
  }),
  session: many(Session, { relationName: "sessionUser" }),
  papercutAccountCustomerAuthorization: many(
    PapercutAccountCustomerAuthorization,
    { relationName: "papercutAccountCustomerAuthorizationCustomer" },
  ),
  papercutAccountManagerAuthorization: many(
    PapercutAccountManagerAuthorization,
    { relationName: "papercutAccountManagerAuthorizationManager" },
  ),
  orderCustomer: many(Order, { relationName: "orderCustomer" }),
  orderManager: many(Order, { relationName: "orderManager" }),
  orderOperator: many(Order, { relationName: "orderOperator" }),
  comment: many(Comment, { relationName: "commentAuthor" }),
  replicacheClientGroup: many(ReplicacheClientGroup, {
    relationName: "userReplicacheClientGroup",
  }),
}));

export const papercutAccountRelations = relations(
  PapercutAccount,
  ({ one, many }) => ({
    organization: one(Organization, {
      fields: [PapercutAccount.orgId],
      references: [Organization.id],
      relationName: "papercutAccountOrg",
    }),
    papercutAccountCustomerAuthorization: many(
      PapercutAccountCustomerAuthorization,
      { relationName: "papercutAccountCustomerAuthorizationPapercutAccount" },
    ),
    papercutAccountManagerAuthorization: many(
      PapercutAccountManagerAuthorization,
      { relationName: "papercutAccountManagerAuthorizationPapercutAccount" },
    ),
    order: many(Order, { relationName: "orderPapercutAccount" }),
  }),
);

export const papercutAccountCustomerAuthorizationRelations = relations(
  PapercutAccountCustomerAuthorization,
  ({ one }) => ({
    organization: one(Organization, {
      fields: [PapercutAccountCustomerAuthorization.orgId],
      references: [Organization.id],
      relationName: "papercutAccountCustomerAuthorizationOrg",
    }),
    customer: one(User, {
      fields: [PapercutAccountCustomerAuthorization.customerId],
      references: [User.id],
      relationName: "papercutAccountCustomerAuthorizationCustomer",
    }),
    papercutAccount: one(PapercutAccount, {
      fields: [PapercutAccountCustomerAuthorization.papercutAccountId],
      references: [PapercutAccount.id],
      relationName: "papercutAccountCustomerAuthorizationPapercutAccount",
    }),
  }),
);

export const papercutAccountManagerAuthorizationRelations = relations(
  PapercutAccountManagerAuthorization,
  ({ one }) => ({
    organization: one(Organization, {
      fields: [PapercutAccountManagerAuthorization.orgId],
      references: [Organization.id],
      relationName: "papercutAccountManagerAuthorizationOrg",
    }),
    manager: one(User, {
      fields: [PapercutAccountManagerAuthorization.managerId],
      references: [User.id],
      relationName: "papercutAccountManagerAuthorizationManager",
    }),
    papercutAccount: one(PapercutAccount, {
      fields: [PapercutAccountManagerAuthorization.papercutAccountId],
      references: [PapercutAccount.id],
      relationName: "papercutAccountManagerAuthorizationPapercutAccount",
    }),
  }),
);

export const roomRelations = relations(Room, ({ one, many }) => ({
  organization: one(Organization, {
    fields: [Room.orgId],
    references: [Organization.id],
    relationName: "roomOrg",
  }),
  announcement: many(Announcement, { relationName: "announcementRoom" }),
  product: many(Product, { relationName: "productRoom" }),
}));

export const announcementRelations = relations(Announcement, ({ one }) => ({
  organization: one(Organization, {
    fields: [Announcement.orgId],
    references: [Organization.id],
    relationName: "announcementOrg",
  }),
  room: one(Room, {
    fields: [Announcement.roomId],
    references: [Room.id],
    relationName: "announcementRoom",
  }),
}));

export const productRelations = relations(Product, ({ one, many }) => ({
  organization: one(Organization, {
    fields: [Product.orgId],
    references: [Organization.id],
    relationName: "productOrg",
  }),
  room: one(Room, {
    fields: [Product.roomId],
    references: [Room.id],
    relationName: "productRoom",
  }),
  order: many(Order, { relationName: "orderProduct" }),
}));

export const orderRelations = relations(Order, ({ one, many }) => ({
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
  manager: one(User, {
    fields: [Order.managerId],
    references: [User.id],
    relationName: "orderManager",
  }),
  operator: one(User, {
    fields: [Order.operatorId],
    references: [User.id],
    relationName: "orderOperator",
  }),
  product: one(Product, {
    fields: [Order.productId],
    references: [Product.id],
    relationName: "orderProduct",
  }),
  papercutAccount: one(PapercutAccount, {
    fields: [Order.papercutAccountId],
    references: [PapercutAccount.id],
    relationName: "orderPapercutAccount",
  }),
  comment: many(Comment, { relationName: "commentOrder" }),
}));

export const commentRelations = relations(Comment, ({ one }) => ({
  organization: one(Organization, {
    fields: [Comment.orgId],
    references: [Organization.id],
    relationName: "commentOrg",
  }),
  order: one(Order, {
    fields: [Comment.orderId],
    references: [Order.id],
    relationName: "commentOrder",
  }),
  author: one(User, {
    fields: [Comment.authorId],
    references: [User.id],
    relationName: "commentAuthor",
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
