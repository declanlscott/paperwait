sst.Linkable.wrap(upstash.RedisDatabase, ({ endpoint, restToken }) => ({
  properties: { endpoint, restToken },
}));

export const redis = new upstash.RedisDatabase("Redis", {
  databaseName: `paperwait-${$app.stage}`,
  region: "us-east-1",
});
