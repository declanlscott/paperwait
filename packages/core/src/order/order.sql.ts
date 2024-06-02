import { foreignKey, pgEnum } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { PapercutAccount } from "../papercut/account.sql";
import { Room } from "../room/room.sql";
import { User } from "../user/user.sql";

export const OrderStatus = pgEnum("order_status", [
  "pending_approval",
  "new",
  "in_progress",
  "completed",
]);
export type OrderStatus = (typeof OrderStatus.enumValues)[number];

export const Order = orgTable(
  "order",
  {
    customerId: id("customer_id").notNull(),
    managerId: id("manager_id"),
    operatorId: id("operator_id"),
    roomId: id("room_id").notNull(),
    papercutAccountId: id("papercut_account_id").notNull(),
    status: OrderStatus("status").notNull(),
  },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "customer_fk",
    }),
    managerId: foreignKey({
      columns: [table.managerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "manager_fk",
    }),
    operatorId: foreignKey({
      columns: [table.operatorId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "operator_fk",
    }),
    roomReference: foreignKey({
      columns: [table.roomId, table.orgId],
      foreignColumns: [Room.id, Room.orgId],
      name: "room_fk",
    }),
    papercutAccountReference: foreignKey({
      columns: [table.papercutAccountId, table.orgId],
      foreignColumns: [PapercutAccount.id, PapercutAccount.orgId],
      name: "papercut_account_fk",
    }),
  }),
);
export type Order = typeof Order.$inferSelect;
