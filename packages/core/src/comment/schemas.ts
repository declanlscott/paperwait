import * as v from "valibot";

import { userRoles } from "../constants/tuples";
import { nanoIdSchema, orgTableSchema } from "../utils/schemas";

export const commentSchema = v.object({
  ...orgTableSchema.entries,
  orderId: nanoIdSchema,
  authorId: nanoIdSchema,
  content: v.string(),
  visibleTo: v.array(v.picklist(userRoles)),
});
