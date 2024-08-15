export const dbCredentials = {
  host: new sst.Secret("PostgresHost"),
  port: new sst.Secret("PostgresPort"),
  user: new sst.Secret("PostgresUser"),
  password: new sst.Secret("PostgresPassword"),
  database: new sst.Secret("PostgresDatabase"),
  ssl: new sst.Secret("PostgresSsl"),
} as const;
