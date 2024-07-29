export const domain = new sst.Secret("ClientDomain", "paperwait.app");

export const isDev = new sst.Secret("ClientIsDev", String($dev));

export const replicacheLicenseKey = new sst.Secret(
  "ClientReplicacheLicenseKey",
);

export const dbCredentials = {
  host: new sst.Secret("PostgresHost"),
  port: new sst.Secret("PostgresPort", "5432"),
  user: new sst.Secret("PostgresUser"),
  password: new sst.Secret("PostgresPassword"),
  database: new sst.Secret("PostgresDatabase"),
  ssl: new sst.Secret("PostgresSsl", "true"),
} as const;

export const partyKitSecrets = {
  apiKey: new sst.Secret("PartyKitApiKey"),
  url: new sst.Secret("ClientPartyKitUrl"),
} as const;

export const googleCredentials = {
  clientId: new sst.Secret("GoogleClientId"),
  clientSecret: new sst.Secret("GoogleClientSecret"),
} as const;
