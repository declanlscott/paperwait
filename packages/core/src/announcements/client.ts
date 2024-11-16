import { AccessControl } from "../access-control/client";
import { Utils } from "../utils/client";
import { ApplicationError } from "../utils/errors";
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
    async (tx, user) =>
      AccessControl.enforce([tx, user, announcementsTableName, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName }],
      }),
    () => async (tx, values) =>
      tx.set(`${announcementsTableName}/${values.id}`, values),
  );

  export const update = Utils.optimisticMutator(
    updateAnnouncementMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, announcementsTableName, "update"], {
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
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, announcementsTableName, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName, id }],
      }),
    ({ user }) =>
      async (tx, values) => {
        if (user.profile.role === "administrator") {
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
