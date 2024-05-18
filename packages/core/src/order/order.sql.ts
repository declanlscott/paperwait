import { User } from "../user";
import { id, orgTable, timestamps } from "../utils";

export const Order = orgTable("order", {
  customerId: id("customer_id")
    .notNull()
    .references(() => User.id),
  ...timestamps,
});
export type Order = typeof Order.$inferSelect;
