import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Resource } from "sst";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: Resource.DatabaseUrl.value });

export const db = drizzle(pool, { logger: true });

export * from "./relations.sql";
export * from "./transaction";
