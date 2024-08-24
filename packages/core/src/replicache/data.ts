import { and, eq, inArray } from "drizzle-orm";

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
import { ReplicacheClient } from "./replicache.sql";

import type { PgSelect } from "drizzle-orm/pg-core";

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
export const nonSyncedTables = [ReplicacheClient];
export const tables = [...syncedTables, ...nonSyncedTables];

export type SyncedTable = (typeof syncedTables)[number];
export type NonSyncedTable = (typeof nonSyncedTables)[number];
export type Table = SyncedTable | NonSyncedTable;

export type SyncedTableName = SyncedTable["_"]["name"];
export type NonSyncedTableName = NonSyncedTable["_"]["name"];
export type TableName = Table["_"]["name"];

export type Metadata<
  TTable extends Table = Extract<Table, { _: { name: TableName } }>,
> = {
  id: TTable["$inferSelect"]["id"];
  rowVersion: number;
};

export type SyncedTableMetadata = [
  SyncedTableName,
  Array<Metadata<Extract<SyncedTable, { _: { name: SyncedTableName } }>>>,
];
export type NonSyncedTableMetadata = [
  NonSyncedTableName,
  Array<Metadata<Extract<NonSyncedTable, { _: { name: NonSyncedTableName } }>>>,
];
export type TableMetadata = [
  TableName,
  Array<Metadata<Extract<Table, { _: { name: TableName } }>>>,
];

export type MetadataQueryFactory = Record<
  SyncedTableName,
  <TSelect extends PgSelect>(select: TSelect) => TSelect
>;

export function metadataQueryFactory() {
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
  } satisfies MetadataQueryFactory;
}

export type DataQueryFactory = {
  [Name in SyncedTableName]: <TSelect extends PgSelect>(
    select: TSelect,
    ids: Array<
      Extract<SyncedTable, { _: { name: Name } }>["$inferSelect"]["id"]
    >,
  ) => TSelect;
};

export function dataQueryFactory() {
  const { org } = useAuthenticated();

  return {
    announcement: (select, ids) =>
      select.where(
        and(inArray(Announcement.id, ids), eq(Announcement.orgId, org.id)),
      ),
    comment: (select, ids) =>
      select.where(and(inArray(Comment.id, ids), eq(Comment.orgId, org.id))),
    order: (select, ids) =>
      select.where(and(inArray(Order.id, ids), eq(Order.orgId, org.id))),
    organization: (select, ids) =>
      select.where(
        and(inArray(Organization.id, ids), eq(Organization.id, org.id)),
      ),
    papercut_account: (select, ids) =>
      select.where(
        and(
          inArray(PapercutAccount.id, ids),
          eq(PapercutAccount.orgId, org.id),
        ),
      ),
    papercut_account_customer_authorization: (select, ids) =>
      select.where(
        and(
          inArray(PapercutAccountCustomerAuthorization.id, ids),
          eq(PapercutAccountCustomerAuthorization.orgId, org.id),
        ),
      ),
    papercut_account_manager_authorization: (select, ids) =>
      select.where(
        and(
          inArray(PapercutAccountManagerAuthorization.id, ids),
          eq(PapercutAccountManagerAuthorization.orgId, org.id),
        ),
      ),
    product: (select, ids) =>
      select.where(and(inArray(Product.id, ids), eq(Product.orgId, org.id))),
    room: (select, ids) =>
      select.where(and(inArray(Room.id, ids), eq(Room.orgId, org.id))),
    user: (select, ids) =>
      select.where(and(inArray(User.id, ids), eq(User.orgId, org.id))),
  } satisfies DataQueryFactory;
}

export type PutsDels<TTable extends SyncedTable> = {
  puts: Array<TTable["$inferSelect"]>;
  dels: Array<TTable["$inferSelect"]["id"]>;
};

export type TableData = [
  SyncedTableName,
  PutsDels<Extract<SyncedTable, { _: { name: SyncedTableName } }>>,
];
