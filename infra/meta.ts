import { domain } from "./dns";
import { partyKitUrl } from "./realtime";

export const replicacheLicenseKey = new sst.Secret("ReplicacheLicenseKey");

const isDev = $dev;

export const client = new sst.Linkable("Client", {
  properties: {
    domain,
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
    domain,
    awsRegion: aws.getRegionOutput({}).name,
    tenantsOrganizationalUnitId: new sst.Secret("TenantsOrganizationalUnitId")
      .value,
    awsOrgRootEmail: new sst.Secret("AwsOrgRootEmail").value,
    createTenantAccountRoleArn: new sst.Secret("CreateTenantAccountRoleArn")
      .value,
  },
});
