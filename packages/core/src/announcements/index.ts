import { and, eq, inArray, sql } from "drizzle-orm";

import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { mutationRbac } from "../replicache/shared";
import { useAuthenticated } from "../sessions/context";
import { Constants } from "../utils/constants";
import { ApplicationError } from "../utils/errors";
import { enforceRbac, fn } from "../utils/shared";
import {
  announcementsTableName,
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
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.createAnnouncement, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName }],
      });

      return useTransaction(async (tx) => {
        await tx.insert(announcementsTable).values(values);

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );

  export async function metadata() {
    const { tenant } = useAuthenticated();

    return useTransaction((tx) =>
      tx
        .select({
          id: announcementsTable.id,
          rowVersion: sql<number>`"${announcementsTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
        })
        .from(announcementsTable)
        .where(eq(announcementsTable.tenantId, tenant.id)),
    );
  }

  export async function fromIds(ids: Array<Announcement["id"]>) {
    const { tenant } = useAuthenticated();

    return useTransaction((tx) =>
      tx
        .select()
        .from(announcementsTable)
        .where(
          and(
            inArray(announcementsTable.id, ids),
            eq(announcementsTable.tenantId, tenant.id),
          ),
        ),
    );
  }

  export const update = fn(
    updateAnnouncementMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.updateAnnouncement, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName, id }],
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
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.deleteAnnouncement, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName, id }],
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
