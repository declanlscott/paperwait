import { appFqdn, domainName } from "./dns";
import {
  organization,
  organizationManagementRole,
  tenantAccountAccessRoleName,
  tenantsOrganizationalUnit,
} from "./organization";
import { replicacheLicenseKey } from "./secrets";

export const isDev = $dev;

export const client = new sst.Linkable("Client", {
  properties: {
    appFqdn,
    isDev,
    replicacheLicenseKey: replicacheLicenseKey.value,
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
      organization: {
        id: organization.id,
        email: organization.masterAccountEmail,
        managementRole: {
          arn: organizationManagementRole.arn,
        },
        tenantsOrganizationalUnit: {
          id: tenantsOrganizationalUnit.id,
        },
      },
      account: {
        id: aws.getCallerIdentityOutput().accountId,
      },
      region: aws.getRegionOutput({}).name,
      tenant: {
        accountAccessRole: {
          name: tenantAccountAccessRoleName,
        },
        realtimeSubscriberRole: {
          name: "TenantRealtimeSubscriberRole",
        },
        realtimePublisherRole: {
          name: "TenantRealtimePublisherRole",
        },
      },
    },
    cloudflare: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    },
  },
});

sst.Linkable.wrap(tls.PrivateKey, (privateKey) => ({
  properties: {
    pem: privateKey.privateKeyPem,
  },
}));

export const cloudfrontPrivateKey = new tls.PrivateKey("CloudfrontPrivateKey", {
  algorithm: "RSA",
  rsaBits: 2048,
});

export const cloudfrontPublicKey = new sst.Linkable("CloudfrontPublicKey", {
  properties: {
    pem: cloudfrontPrivateKey.publicKeyPem,
  },
});
