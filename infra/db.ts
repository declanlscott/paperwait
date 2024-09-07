const AWS_REGION = process.env.AWS_REGION;
if (!AWS_REGION) throw new Error("AWS_REGION is not set");

const SUPABASE_ORG_ID = process.env.SUPABASE_ORG_ID;
if (!SUPABASE_ORG_ID) throw new Error("SUPABASE_ORG_ID is not set");

export const postgres = new supabase.Project("Postgres", {
  name: $interpolate`${$app.name}-${$app.stage}`,
  region: AWS_REGION,
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
