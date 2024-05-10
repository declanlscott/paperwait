import { CLIENT_RESOURCE_PREFIX } from "@paperwait/core/constants";

export const isDev = new sst.Secret(
  `${CLIENT_RESOURCE_PREFIX}IsDev`,
  String($dev),
);

export const replicacheLicenseKey = new sst.Secret(
  `${CLIENT_RESOURCE_PREFIX}ReplicacheLicenseKey`,
);

export const dbCredentials = {
  host: new sst.Secret("PostgresHost"),
  port: new sst.Secret("PostgresPort", "5432"),
  user: new sst.Secret("PostgresUser"),
  password: new sst.Secret("PostgresPassword"),
  database: new sst.Secret("PostgresDatabase"),
  ssl: new sst.Secret("PostgresSsl", "true"),
} as const;

export const partyKitApiKey = new sst.Secret("PartyKitApiKey");

export const googleClientId = new sst.Secret("GoogleClientId");
export const googleClientSecret = new sst.Secret("GoogleClientSecret");
