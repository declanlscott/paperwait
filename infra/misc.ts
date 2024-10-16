import { appFqdn, domainName } from "./dns";
import {
  organization,
  organizationManagementRole,
  tenantAccountAccessRoleName,
  tenantsOrganizationalUnit,
} from "./organization";
import { partyKitUrl, replicacheLicenseKey } from "./secrets";

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
      tenantAccountAccessRole: {
        name: tenantAccountAccessRoleName,
      },
    },
    cloudflare: {
      apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    },
  },
});

export const customResourceEncryptionKey = new random.RandomBytes(
  "CustomResourceEncryptionKey",
  { length: 32 },
);

export const customResourceEncryptionIv = new random.RandomBytes(
  "CustomResourceEncryptionIv",
  { length: 16 },
);

export const customResourceCryptoParameter = new aws.ssm.Parameter(
  "CustomResourceCryptoParameter",
  {
    name: "/paperwait/crypto/custom-resource",
    type: "SecureString",
    value: $jsonStringify({
      key: customResourceEncryptionKey.base64,
      iv: customResourceEncryptionIv.base64,
    }),
  },
);
