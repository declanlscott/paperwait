import { eq, sql } from "drizzle-orm";

import * as Auth from "../auth";
import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ForbiddenError } from "../errors/http";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import * as User from "../user";
import { fn } from "../utils/helpers";
import { updateOrganizationMutationArgsSchema } from "./shared";
import { organizations } from "./sql";

export async function metadata() {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select({
        id: organizations.id,
        rowVersion: sql<number>`"${organizations._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(organizations)
      .where(eq(organizations.id, org.id)),
  );
}

export async function fromId() {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx.select().from(organizations).where(eq(organizations.id, org.id)),
  );
}

export const update = fn(
  updateOrganizationMutationArgsSchema,
  async (values) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.updateOrganization, ForbiddenError);

    const usersToLogout: Awaited<ReturnType<typeof User.fromRoles>> = [];
    if (values.status === "suspended") {
      usersToLogout.push(
        ...(await User.fromRoles(["operator", "manager", "customer"])),
      );
    }

    return useTransaction(async (tx) => {
      await tx
        .update(organizations)
        .set(values)
        .where(eq(organizations.id, org.id));

      await afterTransaction(() =>
        Promise.all([
          ...usersToLogout.map((user) => Auth.invalidateUserSessions(user.id)),
          Replicache.poke([Realtime.formatChannel("org", org.id)]),
        ]),
      );
    });
  },
);

export { organizationSchema as schema } from "./shared";
