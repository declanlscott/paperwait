import { eq, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { useTransaction } from "../drizzle/transaction";
import { organizations } from "./sql";

export const metadata = async () =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select({
        id: organizations.id,
        rowVersion: sql<number>`"${organizations._.name}". "${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(organizations)
      .where(eq(organizations.id, org.id));
  });

export const fromId = async () =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx.select().from(organizations).where(eq(organizations.id, org.id));
  });

export { organizationSchema as schema } from "./schemas";
