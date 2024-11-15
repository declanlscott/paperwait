import { and, eq, inArray } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { Permissions } from "../permissions";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { useAuthenticated } from "../sessions/context";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  createAnnouncementMutationArgsSchema,
  deleteAnnouncementMutationArgsSchema,
  updateAnnouncementMutationArgsSchema,
} from "./shared";
import { announcementsTable } from "./sql";

import type { Announcement } from "./sql";

export namespace Announcements {
  export const create = fn(
    createAnnouncementMutationArgsSchema,
    async (values) => {
      const hasAccess = await Permissions.hasAccess(
        announcementsTable._.name,
        "create",
      );
      if (!hasAccess)
        throw new ApplicationError.AccessDenied({
          name: announcementsTable._.name,
        });

      return useTransaction(async (tx) => {
        await tx.insert(announcementsTable).values(values);

        await afterTransaction(() =>
          Replicache.poke([
            Realtime.formatChannel("tenant", useAuthenticated().tenant.id),
          ]),
        );
      });
    },
  );

  export const read = async (ids: Array<Announcement["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(announcementsTable)
        .where(
          and(
            inArray(announcementsTable.id, ids),
            eq(announcementsTable.tenantId, useAuthenticated().tenant.id),
          ),
        ),
    );

  export const update = fn(
    updateAnnouncementMutationArgsSchema,
    async ({ id, ...values }) => {
      const { tenant } = useAuthenticated();

      const hasAccess = await Permissions.hasAccess(
        announcementsTable._.name,
        "update",
      );
      if (!hasAccess)
        throw new ApplicationError.AccessDenied({
          name: announcementsTable._.name,
          id,
        });

      return useTransaction(async (tx) => {
        await tx
          .update(announcementsTable)
          .set(values)
          .where(
            and(
              eq(announcementsTable.id, id),
              eq(announcementsTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );

  export const delete_ = fn(
    deleteAnnouncementMutationArgsSchema,
    async ({ id, ...values }) => {
      const { tenant } = useAuthenticated();

      const hasAccess = await Permissions.hasAccess(
        announcementsTable._.name,
        "delete",
      );
      if (!hasAccess)
        throw new ApplicationError.AccessDenied({
          name: announcementsTable._.name,
          id,
        });

      return useTransaction(async (tx) => {
        await tx
          .update(announcementsTable)
          .set(values)
          .where(
            and(
              eq(announcementsTable.id, id),
              eq(announcementsTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );
}
