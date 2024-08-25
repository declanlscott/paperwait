import * as v from "valibot";

import { userRoles } from "../constants/tuples";
import { orgTableSchema } from "../utils/schemas";

export const userSchema = v.object({
  ...orgTableSchema.entries,
  providerId: v.string(),
  role: v.picklist(userRoles),
  name: v.string(),
  email: v.string(),
  username: v.string(),
});
