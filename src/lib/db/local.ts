import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { Resource } from "sst";

export const client = new Client({
  connectionString: Resource.LocalDatabaseUrl.value,
});

export const db = drizzle(client);
