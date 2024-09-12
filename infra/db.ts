import { meta } from "./meta";

const SUPABASE_ORG_ID = process.env.SUPABASE_ORG_ID;
if (!SUPABASE_ORG_ID) throw new Error("SUPABASE_ORG_ID is not set");

export const postgres = new supabase.Project("Postgres", {
  name: $interpolate`${$app.name}-${$app.stage}`,
  region: meta.properties.awsRegion,
  organizationId: SUPABASE_ORG_ID,
  databasePassword: new random.RandomString("PostgresPassword", { length: 16 })
    .result,
});

export const db = new sst.Linkable("Db", {
  properties: {
    postgres: {
      url: $interpolate`postgresql://postgres.${postgres.id}:${postgres.databasePassword}@aws-0-${postgres.region}.pooler.supabase.com:6543/postgres`,
    },
  },
});

export const dbGarbageCollection = new sst.aws.Cron("DbGarbageCollection", {
  job: {
    handler: "packages/functions/ts/src/db-garbage-collection.handler",
    timeout: "10 seconds",
    link: [db, meta],
  },
  schedule: "rate(1 day)",
});
