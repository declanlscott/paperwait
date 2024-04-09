import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { Resource } from "sst";

import { Session, User } from "~/lib/db/schema";

const sql = neon(Resource.DatabaseUrl.value);

export const db = drizzle(sql, { logger: true });

export const authAdapter = new DrizzlePostgreSQLAdapter(db, Session, User);
