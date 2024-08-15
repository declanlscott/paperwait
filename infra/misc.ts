import { partyKitUrl } from "./realtime";

export const domain = new sst.Secret("Domain");

export const replicacheLicenseKey = new sst.Secret("ReplicacheLicenseKey");

export const isDev = new sst.Secret("IsDev", String($dev));

export const client = new sst.Linkable("Client", {
  properties: {
    domain: domain.value,
    isDev: isDev.value,
    replicacheLicenseKey: replicacheLicenseKey.value,
    realtimeUrl: partyKitUrl.value,
  },
});
