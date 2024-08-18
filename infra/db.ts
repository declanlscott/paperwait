export const postgres = {
  credentials: {
    host: new sst.Secret("PostgresHost"),
    port: new sst.Secret("PostgresPort"),
    user: new sst.Secret("PostgresUser"),
    password: new sst.Secret("PostgresPassword"),
    database: new sst.Secret("PostgresDatabase"),
    ssl: new sst.Secret("PostgresSsl"),
  },
} as const;

export const redis = new upstash.RedisDatabase("Redis", {
  databaseName: `paperwait-${$app.stage}`,
  region: "us-east-1",
});

export const dynamo = new sst.aws.Dynamo("Dynamo", {
  fields: {
    pk: "string",
    sk: "string",
    gsi1pk: "string",
    gsi1sk: "string",
  },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
  globalIndexes: { gsi1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" } },
});

export const db = new sst.Linkable("Db", {
  properties: {
    postgres: {
      credentials: {
        host: postgres.credentials.host.value,
        port: postgres.credentials.port.value,
        user: postgres.credentials.user.value,
        password: postgres.credentials.password.value,
        database: postgres.credentials.database.value,
        ssl: postgres.credentials.ssl.value,
      },
    },
    redis: {
      endpoint: redis.endpoint,
      restToken: redis.restToken,
    },
    dynamo: dynamo.name,
  },
  include: [
    sst.aws.permission({
      actions: ["dynamodb:*"],
      resources: [dynamo.arn, $interpolate`${dynamo.arn}/*`],
    }),
  ],
});
