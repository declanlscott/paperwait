import { integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { Organization } from "../organization";
import { User } from "../user";
import { id, timestamps } from "../utils";

export const Order = pgTable(
  "order",
  {
    orgId: id("org_id")
      .notNull()
      .references(() => Organization.id),
    number: integer("number").notNull(),
    customerId: id("customer_id")
      .notNull()
      .references(() => User.id),
    ...timestamps,
  },
  ({ orgId, number }) => ({
    id: primaryKey({ columns: [orgId, number] }),
  }),
);
