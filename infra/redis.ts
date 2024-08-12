export const redis = new upstash.RedisDatabase("Redis", {
  databaseName: `paperwait-${$app.stage}`,
  region: "us-east-1",
});
