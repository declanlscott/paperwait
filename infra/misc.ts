import { appFqdn, domainName } from "./dns";
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
    appFqdn,
    isDev,
    replicacheLicenseKey: replicacheLicenseKey.value,
    realtimeUrl: partyKitUrl.value,
  },
});

export const appData = new sst.Linkable("AppData", {
  properties: {
    name: $app.name,
    stage: $app.stage,
    isDev,
    domainName: {
      value: domainName.value,
      fullyQualified: appFqdn,
    },
  },
});

export const cloud = new sst.Linkable("Cloud", {
  properties: {
    aws: {
      identity: aws.getCallerIdentityOutput({}),
      region: aws.getRegionOutput({}).name,
      tenantsOrganizationalUnitId: tenantsOrganizationalUnitId.value,
      orgRootEmail: awsOrgRootEmail.value,
      manageTenantInfraRoleArn: manageTenantInfraRoleArn.value,
    },
    cloudflare: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
    },
  },
});
