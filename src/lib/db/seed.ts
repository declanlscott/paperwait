import { db } from "~/lib/db";
import { ReplicacheMeta, version } from "~/lib/db/schema";

async function seed() {
  await db.insert(ReplicacheMeta).values({
    key: "schemaVersion",
    value: version,
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
