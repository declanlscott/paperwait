import * as v from "valibot";

import { nanoIdSchema, tenantTableSchema } from "../utils/shared";

export const announcementsTableName = "announcements";

export const announcementSchema = v.object({
  ...tenantTableSchema.entries,
  content: v.string(),
  roomId: nanoIdSchema,
});

export const announcementMutationNames = [
  "createAnnouncement",
  "updateAnnouncement",
  "deleteAnnouncement",
] as const;

export const createAnnouncementMutationArgsSchema = announcementSchema;
export type CreateAnnouncementMutationArgs = v.InferOutput<
  typeof createAnnouncementMutationArgsSchema
>;

export const updateAnnouncementMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(announcementSchema, [
      "id",
      "tenantId",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateAnnouncementMutationArgs = v.InferOutput<
  typeof updateAnnouncementMutationArgsSchema
>;

export const deleteAnnouncementMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteAnnouncementMutationArgs = v.InferOutput<
  typeof deleteAnnouncementMutationArgsSchema
>;
