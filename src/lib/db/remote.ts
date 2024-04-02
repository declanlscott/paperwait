import { Client } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Resource } from "sst";

export const client = new Client(Resource.RemoteDatabaseUrl.value);

export const db = drizzle(client);
