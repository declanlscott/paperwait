import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Client } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Resource } from "sst";

import { session, user } from "~/lib/db/schema";

export const client = new Client(Resource.RemoteDatabaseUrl.value);

export const db = drizzle(client);

export const adapter = new DrizzlePostgreSQLAdapter(db, session, user);
