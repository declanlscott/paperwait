import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  schema: "./src/**/*.sql.ts",
  out: "./migrations/",
  driver: "pg",
  dbCredentials: {
    connectionString: Resource.DatabaseUrl.value,
  },
});
