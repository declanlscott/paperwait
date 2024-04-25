import { CLIENT_RESOURCE_PREFIX } from "@paperwait/core/constants";

export const isDev = new sst.Secret("IsDev", String($dev));
export const replicacheLicenseKey = new sst.Secret(
  `${CLIENT_RESOURCE_PREFIX}ReplicacheLicenseKey`,
);
export const databaseUrl = new sst.Secret("DatabaseUrl");
export const partyKitApiKey = new sst.Secret("PartyKitApiKey");
