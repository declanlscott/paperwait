import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  schema: "./src/**/*.sql.ts",
  out: "./migrations/",
  dialect: "postgresql",
  dbCredentials: {
    host: Resource.PostgresHost.value,
    port: Number(Resource.PostgresPort.value),
    user: Resource.PostgresUser.value,
    password: Resource.PostgresPassword.value,
    database: Resource.PostgresDatabase.value,
    ssl: Resource.PostgresSsl.value === "true",
  },
});
