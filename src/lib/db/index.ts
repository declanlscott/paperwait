import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Resource } from "sst";
import ws from "ws";

import { Session, User } from "~/lib/db/schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: Resource.DatabaseUrl.value });

export const db = drizzle(pool, { logger: true });

export const authAdapter = new DrizzlePostgreSQLAdapter(db, Session, User);
