import { eq } from "drizzle-orm";

import { Announcement } from "../announcement/announcement.sql";
import { useAuthenticated } from "../auth/context";
import { Comment } from "../comment/comment.sql";
import { Order } from "../order/order.sql";
import { Organization } from "../organization/organization.sql";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import { Room } from "../room/room.sql";
import { User } from "../user/user.sql";

import type { PgSelect } from "drizzle-orm/pg-core";
import type { ReplicacheClient } from "./replicache.sql";

export const syncedTables = [
  Announcement,
  Comment,
  Order,
  Organization,
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
  Product,
  Room,
  User,
];

export type SyncedTable = (typeof syncedTables)[number];

export type SyncedTableName = SyncedTable["_"]["name"];
export type TableName = SyncedTableName | typeof ReplicacheClient._.name;

export type SyncedTableMetadataQueryBuilderFactory = Record<
  SyncedTableName,
  <TSelect extends PgSelect>(select: TSelect) => TSelect
>;

export type Metadata = {
  id: string | number;
  rowVersion: number;
};

export type SyncedTableMetadata = [SyncedTableName, Array<Metadata>];

export function syncedTableMetadataQueryBuilderFactory() {
  const { org } = useAuthenticated();

  return {
    announcement: (select) => select.where(eq(Announcement.orgId, org.id)),
    comment: (select) => select.where(eq(Comment.orgId, org.id)),
    order: (select) => select.where(eq(Order.orgId, org.id)),
    organization: (select) => select.where(eq(Organization.id, org.id)),
    papercut_account: (select) =>
      select.where(eq(PapercutAccount.orgId, org.id)),
    papercut_account_customer_authorization: (select) =>
      select.where(eq(PapercutAccountCustomerAuthorization.orgId, org.id)),
    papercut_account_manager_authorization: (select) =>
      select.where(eq(PapercutAccountManagerAuthorization.orgId, org.id)),
    product: (select) => select.where(eq(Product.orgId, org.id)),
    room: (select) => select.where(eq(Room.orgId, org.id)),
    user: (select) => select.where(eq(User.orgId, org.id)),
  } satisfies SyncedTableMetadataQueryBuilderFactory;
}
