import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: isProd
      ? Resource.RemoteDatabaseUrl.value
      : Resource.LocalDatabaseUrl.value,
  },
});
