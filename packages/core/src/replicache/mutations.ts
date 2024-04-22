import { eq } from "drizzle-orm";
import { parse } from "valibot";

import { assertRole, User } from "../user";
import { mutationMeta, updateUserRoleSchema } from "./schemas";

import type { User as LuciaUser } from "lucia";
import type { Transaction } from "../database";
import type { Mutation } from "./schemas";

export async function updateUserRole(
  tx: Transaction,
  user: LuciaUser,
  mutation: Mutation,
) {
  assertRole(user, mutationMeta[mutation.name].roleSet);
  const args = parse(updateUserRoleSchema, mutation.args);

  await tx
    .update(User)
    .set({ role: args.role })
    .where(eq(User.id, args.userId));
}
