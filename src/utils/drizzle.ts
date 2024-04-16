import { char, timestamp } from "drizzle-orm/pg-core";

import { NANOID_LENGTH } from "~/utils/constants";

export function id(name: string) {
  return char(name, { length: NANOID_LENGTH });
}

export const timestamps = {
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
};

export type OmitTimestamps<Table> = Omit<Table, keyof typeof timestamps>;
