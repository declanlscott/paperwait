import { eq, sql } from "drizzle-orm";

import { User } from "../user";

import type { User as LuciaUser } from "lucia";
import type { Transaction } from "../database";

export async function readMetadata(tx: Transaction, user: LuciaUser) {
  const users = await searchUsers(tx, user);
}

export async function searchUsers(tx: Transaction, user: LuciaUser) {
  switch (user.role) {
    case "customer":
      return [];
    case "manager":
    case "technician":
    case "administrator": {
      return await tx
        .select({ id: User.id, rowVersion: sql<number>`xmin` })
        .from(User)
        .where(eq(User.orgId, user.orgId));
    }
  }
}
