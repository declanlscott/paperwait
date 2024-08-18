import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  schema: "./src/**/*.sql.ts",
  out: "./migrations/",
  dialect: "postgresql",
  dbCredentials: {
    host: Resource.Db.postgres.credentials.host,
    port: Number(Resource.Db.postgres.credentials.port),
    user: Resource.Db.postgres.credentials.user,
    password: Resource.Db.postgres.credentials.password,
    database: Resource.Db.postgres.credentials.database,
    ssl: Resource.Db.postgres.credentials.ssl === "true",
  },
});
