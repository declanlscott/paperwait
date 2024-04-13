// TODO: Remove @pulumi/aws dependency in the future and use sst's global
import { Region } from "@pulumi/aws";
import { z } from "astro/zod";

import { unionizeCollection } from "~/utils/zod";

export default z
  .object({
    AWS_ORG_NAME: z.string(),
    AWS_REGION: unionizeCollection(Object.values(Region), {
      errorMap: (error) => ({
        message: `AWS_REGION must be one of the supported regions. ${error.message}`,
      }),
    }),
    DOMAIN: z.string(),
  })
  .parse(process.env);
