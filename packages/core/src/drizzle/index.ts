import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Resource } from "sst";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  host: Resource.Db.postgres.credentials.host,
  port: Number(Resource.Db.postgres.credentials.port),
  user: Resource.Db.postgres.credentials.user,
  password: Resource.Db.postgres.credentials.password,
  database: Resource.Db.postgres.credentials.database,
  ssl: Resource.Db.postgres.credentials.ssl === "true",
});

export const db = drizzle(pool, { logger: true });

export * from "drizzle-orm";
