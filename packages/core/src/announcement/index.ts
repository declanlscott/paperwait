import { and, eq, inArray, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth/context";
import { enforceRbac, mutationRbac } from "../auth/rbac";
import { ROW_VERSION_COLUMN_NAME } from "../constants/db";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { ForbiddenError } from "../errors/http";
import * as Realtime from "../realtime";
import * as Replicache from "../replicache";
import { fn } from "../utils/helpers";
import {
  createAnnouncementMutationArgsSchema,
  deleteAnnouncementMutationArgsSchema,
  updateAnnouncementMutationArgsSchema,
} from "./shared";
import { announcements } from "./sql";

import type { Announcement } from "./sql";

export const create = fn(
  createAnnouncementMutationArgsSchema,
  async (values) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.createAnnouncement, ForbiddenError);

    return useTransaction(async (tx) => {
      const announcement = await tx
        .insert(announcements)
        .values(values)
        .returning({ id: announcements.id })
        .then((rows) => rows.at(0));
      if (!announcement) throw new Error("Failed to insert announcement");

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );

      return { announcement };
    });
  },
);

export async function metadata() {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select({
        id: announcements.id,
        rowVersion: sql<number>`"${announcements._.name}"."${ROW_VERSION_COLUMN_NAME}"`,
      })
      .from(announcements)
      .where(eq(announcements.orgId, org.id)),
  );
}

export async function fromIds(ids: Array<Announcement["id"]>) {
  const { org } = useAuthenticated();

  return useTransaction((tx) =>
    tx
      .select()
      .from(announcements)
      .where(
        and(inArray(announcements.id, ids), eq(announcements.orgId, org.id)),
      ),
  );
}

export const update = fn(
  updateAnnouncementMutationArgsSchema,
  async ({ id, ...values }) => {
    const { user, org } = useAuthenticated();

    enforceRbac(user, mutationRbac.updateAnnouncement, ForbiddenError);

    return useTransaction(async (tx) => {
      await tx
        .update(announcements)
        .set(values)
        .where(and(eq(announcements.id, id), eq(announcements.orgId, org.id)));

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

    enforceRbac(user, mutationRbac.deleteAnnouncement, ForbiddenError);

    return useTransaction(async (tx) => {
      await tx
        .update(announcements)
        .set(values)
        .where(and(eq(announcements.id, id), eq(announcements.orgId, org.id)));

      await afterTransaction(() =>
        Replicache.poke([Realtime.formatChannel("org", org.id)]),
      );
    });
  },
);

export { announcementSchema as schema } from "./shared";
