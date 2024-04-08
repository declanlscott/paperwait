// TODO: Remove @pulumi/aws dependency in the future and use sst's global
import { Region } from "@pulumi/aws";
import { z } from "astro/zod";

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
  })
  .parse(process.env);
