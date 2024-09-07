import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";

const client = postgres(Resource.Db.postgres.url, {
  prepare: false,
});

export const db = drizzle(client, { logger: true });

export * from "drizzle-orm";
