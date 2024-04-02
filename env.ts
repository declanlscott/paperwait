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

export const localPostgres = z.object({
  LOCAL_POSTGRES_USER: z.string(),
  LOCAL_POSTGRES_PASSWORD: z.string(),
  LOCAL_POSTGRES_DB: z.string(),
  LOCAL_POSTGRES_PORT: z.coerce.number(),
});

export function buildLocalDatabaseUrl() {
  const {
    LOCAL_POSTGRES_USER,
    LOCAL_POSTGRES_PASSWORD,
    LOCAL_POSTGRES_DB,
    LOCAL_POSTGRES_PORT,
  } = localPostgres.parse(process.env);

  return `postgresql://${LOCAL_POSTGRES_USER}:${LOCAL_POSTGRES_PASSWORD}@localhost:${LOCAL_POSTGRES_PORT}/${LOCAL_POSTGRES_DB}`;
}
