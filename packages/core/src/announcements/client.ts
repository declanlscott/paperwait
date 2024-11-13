import { mutationRbac } from "../replicache/shared";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
import { enforceRbac } from "../utils/shared";
import {
  announcementsTableName,
  createAnnouncementMutationArgsSchema,
  deleteAnnouncementMutationArgsSchema,
  updateAnnouncementMutationArgsSchema,
} from "./shared";

import type { DeepReadonlyObject } from "replicache";
import type { Announcement } from "./sql";

export namespace Announcements {
  export const create = Utils.optimisticMutator(
    createAnnouncementMutationArgsSchema,
    (user) =>
      enforceRbac(user, mutationRbac.createAnnouncement, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName }],
      }),
    () => async (tx, values) =>
      tx.set(`${announcementsTableName}/${values.id}`, values),
  );

  export const update = Utils.optimisticMutator(
    updateAnnouncementMutationArgsSchema,
    (user, _tx, { id }) =>
      enforceRbac(user, mutationRbac.updateAnnouncement, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName, id }],
      }),
    () => async (tx, values) => {
      const prev = await tx.get<Announcement>(
        `${announcementsTableName}/${values.id}`,
      );
      if (!prev)
        throw new ApplicationError.EntityNotFound({
          name: announcementsTableName,
          id: values.id,
        });

      const next = {
        ...prev,
        ...values,
      } satisfies DeepReadonlyObject<Announcement>;

      return tx.set(`${announcementsTableName}/${values.id}`, next);
    },
  );

  export const delete_ = Utils.optimisticMutator(
    deleteAnnouncementMutationArgsSchema,
    (user, _tx, { id }) =>
      enforceRbac(user, mutationRbac.deleteAnnouncement, {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName, id }],
      }),
    ({ user }) =>
      async (tx, values) => {
        if (enforceRbac(user, ["administrator"])) {
          const prev = await tx.get<Announcement>(
            `${announcementsTableName}/${values.id}`,
          );
          if (!prev)
            throw new ApplicationError.EntityNotFound({
              name: announcementsTableName,
              id: values.id,
            });

          const next = {
            ...prev,
            ...values,
          } satisfies DeepReadonlyObject<Announcement>;

          return tx.set(`${announcementsTableName}/${values.id}`, next);
        }

        const success = await tx.del(`${announcementsTableName}/${values.id}`);
        if (!success)
          throw new ApplicationError.EntityNotFound({
            name: announcementsTableName,
            id: values.id,
          });
      },
  );
}
