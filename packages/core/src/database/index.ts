import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Resource } from "sst";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  host: Resource.PostgresHost.value,
  port: Number(Resource.PostgresPort.value),
  user: Resource.PostgresUser.value,
  password: Resource.PostgresPassword.value,
  database: Resource.PostgresDatabase.value,
  ssl: Resource.PostgresSsl.value === "true",
});

export const db = drizzle(pool, { logger: true });

export * from "./relations.sql";
export * from "./transaction";
export { NeonDbError as DatabaseError } from "@neondatabase/serverless";
