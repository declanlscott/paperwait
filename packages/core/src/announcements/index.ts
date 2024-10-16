import { and, eq, inArray, sql } from "drizzle-orm";

import { Constants } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { AccessDenied } from "../errors/application";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { mutationRbac } from "../replicache/shared";
import { useAuthenticated } from "../sessions/context";
import { enforceRbac, fn, rbacErrorMessage } from "../utils/shared";
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
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.createAnnouncement, {
        Error: AccessDenied,
        args: [rbacErrorMessage(user, "create announcement mutator")],
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
        Error: AccessDenied,
        args: [rbacErrorMessage(user, "update announcement mutator")],
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
        Error: AccessDenied,
        args: [rbacErrorMessage(user, "delete announcement mutator")],
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
