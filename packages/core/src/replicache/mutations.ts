import { eq } from "drizzle-orm";

import { assertRole, User } from "../user";
import { formatChannel } from "../utils";
import { mutationPermissions } from "./schemas";

import type { LuciaUser } from "../auth";
import type { Transaction } from "../database";
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
