import { DB_SCHEMA_VERSION } from "@paperwait/core/constants";
import { db } from "@paperwait/core/database";
import { ReplicacheMeta } from "@paperwait/core/replicache";

async function seed() {
  await db.insert(ReplicacheMeta).values({
    key: "schemaVersion",
    value: DB_SCHEMA_VERSION,
  });
}

async function main() {
  console.log("🌱 Seeding database...");

  try {
    await seed();
    console.log("✅ Seeding completed!");
  } catch (e) {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  }
}

void main();
