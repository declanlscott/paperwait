import * as v from "valibot";

import { orgStatuses } from "../constants/tuples";
import { nanoIdSchema, timestampsSchema } from "../utils/schemas";

export const organizationSchema = v.object({
  id: nanoIdSchema,
  slug: v.string(),
  name: v.string(),
  status: v.picklist(orgStatuses),
  licenseKey: v.pipe(v.string(), v.uuid()),
  oAuth2ProviderId: v.nullable(v.string()),
  ...timestampsSchema.entries,
});
