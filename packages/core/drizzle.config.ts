import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
  schema: [
    "./src/drizzle/enums.sql.ts",
    "./src/drizzle/relations.sql.ts",
    "./src/**/sql.ts",
  ],
  out: "./migrations/",
  dialect: "postgresql",
  dbCredentials: {
    url: Resource.Db.postgres.url,
  },
});
