import { and, eq, inArray, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { AccessDenied } from "../errors/application";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import { fn } from "../utils/helpers";
import {
  createAnnouncementMutationArgsSchema,
  deleteAnnouncementMutationArgsSchema,
  updateAnnouncementMutationArgsSchema,
} from "./shared";
import { announcementsTable } from "./sql";

import type { Announcement } from "./sql";

export const create = fn(
  createAnnouncementMutationArgsSchema,
  async (values) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.createAnnouncement, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "create announcement mutator")],
    });

    return useTransaction(async (tx) => {
      await tx.insert(announcementsTable).values(values);

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export async function metadata() {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select({
        id: announcementsTable.id,
        rowVersion: sql<number>`"${announcementsTable._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(announcementsTable)
      .where(eq(announcementsTable.orgId, org.id)),
  );
}

export async function fromIds(ids: Array<Announcement["id"]>) {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(announcementsTable)
      .where(
        and(
          inArray(announcementsTable.id, ids),
          eq(announcementsTable.orgId, org.id),
        ),
      ),
  );
}

export const update = fn(
  updateAnnouncementMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

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
            eq(announcementsTable.orgId, org.id),
          ),
        );

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export const delete_ = fn(
  deleteAnnouncementMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

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
            eq(announcementsTable.orgId, org.id),
          ),
        );

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export { announcementSchema as schema } from "./shared";
