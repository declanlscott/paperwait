import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";

const client = postgres({
  host: Resource.Db.postgres.credentials.host,
  port: Number(Resource.Db.postgres.credentials.port),
  user: Resource.Db.postgres.credentials.user,
  password: Resource.Db.postgres.credentials.password,
  database: Resource.Db.postgres.credentials.database,
  prepare: false,
});

export const db = drizzle(client, { logger: true });

export * from "drizzle-orm";
