import { and, eq, isNull, sql } from "drizzle-orm";

import * as Auth from "../auth";
import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { AccessDenied } from "../errors/application";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import * as Users from "../users";
import { fn } from "../utils/helpers";
import { updateOrganizationMutationArgsSchema } from "./shared";
import { licensesTable, organizationsTable } from "./sql";

import type { Organization } from "./sql";

export async function metadata() {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select({
        id: organizationsTable.id,
        rowVersion: sql<number>`"${organizationsTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, org.id)),
  );
}

export async function fromId() {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, org.id)),
  );
}

export const update = fn(
  updateOrganizationMutationArgsSchema,
  async (values) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.updateOrganization, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "update organization mutator")],
    });

    const usersToLogout: Awaited<ReturnType<typeof Users.fromRoles>> = [];
    if (values.status === "suspended") {
      usersToLogout.push(
        ...(await Users.fromRoles(["operator", "manager", "customer"])),
      );
    }

    return useTransaction(async (tx) => {
      await tx
        .update(organizationsTable)
        .set(values)
        .where(eq(organizationsTable.id, org.id));

      await afterTransaction(() =>
        Promise.all([
          ...usersToLogout.map((user) => Auth.invalidateUserSessions(user.id)),
          Replicache.poke([Realtime.formatChannel("org", org.id)]),
        ]),
      );
    });
  },
);

export const isSlugUnique = async (slug: Organization["slug"]) =>
  useTransaction((tx) =>
    tx
      .select({})
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug))
      .then((rows) => rows.length === 0),
  );

export const isLicenseKeyAvailable = async (
  licenseKey: Organization["licenseKey"],
) =>
  useTransaction((tx) =>
    tx
      .select({})
      .from(licensesTable)
      .where(
        and(
          eq(licensesTable.key, licenseKey),
          eq(licensesTable.status, "active"),
          isNull(licensesTable.orgId),
        ),
      )
      .then((rows) => rows.length === 1),
  );

export { organizationSchema as schema } from "./shared";
