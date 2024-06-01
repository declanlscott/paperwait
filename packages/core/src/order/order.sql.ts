import { foreignKey, pgEnum } from "drizzle-orm/pg-core";

import { id } from "../drizzle/columns";
import { orgTable } from "../drizzle/tables";
import { PapercutAccount } from "../papercut/account.sql";
import { Room } from "../room/room.sql";
import { User } from "../user/user.sql";

export const orderStatus = pgEnum("order_status", [
  "pending_approval",
  "new",
  "in_progress",
  "completed",
]);

export const Order = orgTable(
  "order",
  {
    customerId: id("customer_id").notNull(),
    roomId: id("room_id").notNull(),
    papercutAccountId: id("papercut_account_id").notNull(),
    status: orderStatus("status").notNull(),
  },
  (table) => ({
    customerReference: foreignKey({
      columns: [table.customerId, table.orgId],
      foreignColumns: [User.id, User.orgId],
      name: "customer_fk",
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
