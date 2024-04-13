import { db } from "~/lib/server/db";
import { ReplicacheMeta } from "~/lib/server/db/schema";
import { DB_SCHEMA_VERSION } from "~/utils/constants";

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

await main();
