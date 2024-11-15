import { and, eq, isNull } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { Permissions } from "../permissions";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { Sessions } from "../sessions";
import { useAuthenticated } from "../sessions/context";
import { Users } from "../users";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import { updateTenantMutationArgsSchema } from "./shared";
import { licensesTable, tenantsTable } from "./sql";

import type { License, Tenant } from "./sql";

export namespace Tenants {
  export const read = async () =>
    useTransaction((tx) =>
      tx
        .select()
        .from(tenantsTable)
        .where(eq(tenantsTable.id, useAuthenticated().tenant.id)),
    );

  export const update = fn(updateTenantMutationArgsSchema, async (values) => {
    const { tenant } = useAuthenticated();

    const hasAccess = await Permissions.hasAccess(
      tenantsTable._.name,
      "update",
    );
    if (!hasAccess)
      throw new ApplicationError.AccessDenied({
        name: tenantsTable._.name,
        id: values.id,
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
          ...usersToLogout.map((user) => Sessions.invalidateUser(user.id)),
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
}
