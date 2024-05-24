import { eq } from "drizzle-orm";

import { formatChannel } from "../realtime";
import { assertRole } from "../user/assert";
import { User } from "../user/user.sql";
import { mutationPermissions } from "./schemas";

import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type { UpdateUserRoleMutationArgs } from "./schemas";

export async function updateUserRole(
  tx: Transaction,
  user: LuciaUser,
  mutationArgs: UpdateUserRoleMutationArgs,
) {
  assertRole(user, mutationPermissions.updateUserRole);

  const [admins] = await Promise.all([
    tx.select({ id: User.id }).from(User).where(eq(User.role, "administrator")),
    tx
      .update(User)
      .set({ role: mutationArgs.newRole })
      .where(eq(User.id, mutationArgs.userId)),
  ]);

  return [
    formatChannel("user", mutationArgs.userId),
    ...admins.map(({ id }) => formatChannel("user", id)),
  ];
}
