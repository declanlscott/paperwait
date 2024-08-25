import * as v from "valibot";

import { nanoIdSchema, orgTableSchema } from "../utils/schemas";

export const announcementSchema = v.object({
  ...orgTableSchema.entries,
  content: v.string(),
  roomId: nanoIdSchema,
});
