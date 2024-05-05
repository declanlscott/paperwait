import { relations } from "drizzle-orm";

import { Session } from "../auth";
import { Order } from "../order/order.sql";
import { Organization } from "../organization";
import {
  ReplicacheClient,
  ReplicacheClientGroup,
  ReplicacheClientViewRecord,
} from "../replicache";
import { User } from "../user";

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

export const organizationRelations = relations(Organization, ({ many }) => ({
  user: many(User, { relationName: "userOrg" }),
  order: many(Order, { relationName: "orderOrg" }),
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
