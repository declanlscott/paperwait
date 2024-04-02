import { z } from "astro/zod";

// TODO: Remove @pulumi/aws dependency in the future and use sst's global
import { Region } from "@pulumi/aws";

export default z
  .object({
    AWS_ORG_NAME: z.string(),
    AWS_REGION: z.union(
      Object.values(Region).map((region) =>
        z.literal(region),
      ) as unknown as readonly [
        z.ZodLiteral<Region>,
        z.ZodLiteral<Region>,
        ...z.ZodLiteral<Region>[],
      ],
      {
        errorMap: (error) => ({
          message: `AWS_REGION must be one of the supported regions. ${error.message}`,
        }),
      },
    ),
    AWS_RDS_PROXY_ENDPOINT: z.string(),
  })
  .parse(process.env);
