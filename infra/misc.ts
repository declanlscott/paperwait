import { partyKitUrl } from "./realtime";

export const domain = new sst.Secret("Domain");

export const replicacheLicenseKey = new sst.Secret("ReplicacheLicenseKey");

const isDev = String($dev);

export const client = new sst.Linkable("Client", {
  properties: {
    domain: domain.value,
    isDev,
    replicacheLicenseKey: replicacheLicenseKey.value,
    realtimeUrl: partyKitUrl.value,
  },
});

export const meta = new sst.Linkable("Meta", {
  properties: {
    app: {
      name: $app.name,
      stage: $app.stage,
    },
    isDev,
    domain: domain.value,
  },
});
