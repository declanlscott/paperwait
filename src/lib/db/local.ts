import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { Resource } from "sst";

import { session, user } from "~/lib/db/schema";

export const client = new Client({
  connectionString: Resource.LocalDatabaseUrl.value,
});

export const db = drizzle(client);

export const adapter = new DrizzlePostgreSQLAdapter(db, session, user);
