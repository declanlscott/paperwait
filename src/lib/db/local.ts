import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { Resource } from "sst";

import { Session, User } from "~/lib/db/schema";

const { Client } = pg;

const client = new Client({
  connectionString: Resource.LocalDatabaseUrl.value,
});

await client.connect();
export const db = drizzle(client);

export const authAdapter = new DrizzlePostgreSQLAdapter(db, Session, User);
