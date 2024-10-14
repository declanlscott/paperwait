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
import { fn } from "../utils/shared";
import { updateTenantMutationArgsSchema } from "./shared";
import { licensesTable, tenantsTable } from "./sql";

import type { License, Tenant } from "./sql";

export async function metadata() {
  const { tenant } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select({
        id: tenantsTable.id,
        rowVersion: sql<number>`"${tenantsTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenant.id)),
  );
}

export async function fromId() {
  const { tenant } = useAuthenticated();

  return useTransaction((tx) =>
    tx.select().from(tenantsTable).where(eq(tenantsTable.id, tenant.id)),
  );
}

export const update = fn(updateTenantMutationArgsSchema, async (values) => {
  const { user, tenant } = useAuthenticated();

  enforceRbac(user, mutationRbac.updateTenant, {
    Error: AccessDenied,
    args: [rbacErrorMessage(user, "update tenant mutator")],
  });

  const usersToLogout: Awaited<ReturnType<typeof Users.fromRoles>> = [];
  if (values.status === "suspended") {
    usersToLogout.push(
      ...(await Users.fromRoles(["operator", "manager", "customer"])),
    );
  }

  return useTransaction(async (tx) => {
    await tx
      .update(tenantsTable)
      .set(values)
      .where(eq(tenantsTable.id, tenant.id));

    await afterTransaction(() =>
      Promise.all([
        ...usersToLogout.map((user) => Auth.invalidateUserSessions(user.id)),
        Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
      ]),
    );
  });
});

export const isSlugUnique = async (slug: Tenant["slug"]) =>
  useTransaction((tx) =>
    tx
      .select({})
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .then((rows) => rows.length === 0),
  );

export const isLicenseKeyAvailable = async (licenseKey: License["key"]) =>
  useTransaction((tx) =>
    tx
      .select({})
      .from(licensesTable)
      .where(
        and(
          eq(licensesTable.key, licenseKey),
          eq(licensesTable.status, "active"),
          isNull(licensesTable.tenantId),
        ),
      )
      .then((rows) => rows.length === 1),
  );

export { tenantSchema as schema } from "./shared";
