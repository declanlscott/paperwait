import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";

export const db = drizzle(
  postgres(Resource.Db.postgres.url, {
    prepare: false,
  }),
  { logger: true },
);

export type Db = typeof db;
