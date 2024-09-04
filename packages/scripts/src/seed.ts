import { DB_SCHEMA_VERSION } from "@paperwait/core/constants";
import { db } from "@paperwait/core/drizzle";
import { replicacheMeta } from "@paperwait/core/replicache/sql";

async function seed() {
  await db.insert(replicacheMeta).values({
    key: "schemaVersion",
    value: DB_SCHEMA_VERSION,
  });
}

async function main() {
  console.log("🌱 Seeding database...");

  try {
    await seed();
    console.log("✅ Seeding completed!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  }
}

void main();
