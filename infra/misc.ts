import { domain } from "./dns";
import {
  awsOrgRootEmail,
  manageTenantInfraRoleArn,
  partyKitUrl,
  replicacheLicenseKey,
  tenantsOrganizationalUnitId,
} from "./secrets";

export const isDev = $dev;

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
  },
});

export const aws_ = new sst.Linkable("Aws", {
  properties: {
    accountId: aws.getCallerIdentityOutput({}).accountId,
    region: aws.getRegionOutput({}).name,
    tenantsOrganizationalUnitId: tenantsOrganizationalUnitId.value,
    orgRootEmail: awsOrgRootEmail.value,
    manageTenantInfraRoleArn: manageTenantInfraRoleArn.value,
  },
});
