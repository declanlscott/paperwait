import { enforceRbac, mutationRbac, rbacErrorMessage } from "../auth/rbac";
import { AccessDenied, EntityNotFound } from "../errors/application";
import { optimisticMutator } from "../utils/helpers";
import {
  announcementsTableName,
  createAnnouncementMutationArgsSchema,
  deleteAnnouncementMutationArgsSchema,
  updateAnnouncementMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Announcement } from "./sql";

export const create = optimisticMutator(
  createAnnouncementMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.createAnnouncement, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "create announcement mutator")],
    }),
  () => async (tx, values) =>
    tx.set(`${announcementsTableName}/${values.id}`, values),
);

export const update = optimisticMutator(
  updateAnnouncementMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.updateAnnouncement, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "update announcement mutator")],
    }),
  () => async (tx, values) => {
    const prev = await tx.get<Announcement>(
      `${announcementsTableName}/${values.id}`,
    );
    if (!prev) throw new EntityNotFound(announcementsTableName, values.id);

    const next = {
      ...prev,
      ...values,
    } satisfies DeepReadonlyObject<Announcement>;

    return tx.set(`${announcementsTableName}/${values.id}`, next);
  },
);

export const delete_ = optimisticMutator(
  deleteAnnouncementMutationArgsSchema,
  (user) =>
    enforceRbac(user, mutationRbac.deleteAnnouncement, {
      Error: AccessDenied,
      args: [rbacErrorMessage(user, "delete announcement mutator")],
    }),
  ({ user }) =>
    async (tx, values) => {
      if (enforceRbac(user, ["administrator"])) {
        const prev = await tx.get<Announcement>(
          `${announcementsTableName}/${values.id}`,
        );
        if (!prev) throw new EntityNotFound(announcementsTableName, values.id);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Announcement>;

        return tx.set(`${announcementsTableName}/${values.id}`, next);
      }

      const success = await tx.del(`${announcementsTableName}/${values.id}`);
      if (!success) throw new EntityNotFound(announcementsTableName, values.id);
    },
);

export { announcementSchema as schema } from "./shared";
