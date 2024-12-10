import { dsqlCluster } from "./db";
import { appFqdn } from "./dns";

export const entraIdApplication = new azuread.ApplicationRegistration(
  "EntraIdApplicationRegistration",
  {
    displayName:
      $app.stage === "production"
        ? $app.name.charAt(0).toUpperCase() + $app.name.slice(1)
        : `${$app.name}-${$app.stage}`,
    signInAudience: "AzureADMultipleOrgs",
    implicitAccessTokenIssuanceEnabled: true,
    implicitIdTokenIssuanceEnabled: true,
    homepageUrl: $interpolate`https://${appFqdn}`,
  },
);

export const entraIdApplicationIServicePrincipal = new azuread.ServicePrincipal(
  "EntraIdApplicationServicePrincipal",
  { clientId: entraIdApplication.clientId },
);

const wellKnown = azuread.getApplicationPublishedAppIds();
const graphAppId = await wellKnown.then(({ result }) => result?.MicrosoftGraph);

const graphServicePrincipal = new azuread.ServicePrincipal(
  "GraphServicePrincipal",
  {
    clientId: graphAppId,
    useExisting: true,
  },
);

export const entraIdApplicationApiAccess = new azuread.ApplicationApiAccess(
  "EntraIdApplicationApiAccess",
  {
    applicationId: entraIdApplication.id,
    apiClientId: graphAppId,
    scopeIds: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "User.Read",
      "User.ReadBasic.All",
    ].map((scope) => graphServicePrincipal.oauth2PermissionScopeIds[scope]),
  },
);

export const rotationHours = 24 * 7 * 26; // 6 months
export const clientSecretRotation = new time.Rotating("ClientSecretRotation", {
  rotationHours,
});

export const entraIdClientSecret = new azuread.ApplicationPassword(
  "EntraIdClientSecret",
  {
    applicationId: entraIdApplication.id,
    endDateRelative: `${rotationHours.toString()}h`,
    rotateWhenChanged: {
      rotation: clientSecretRotation.id,
    },
  },
);

export const googleClientId = new sst.Secret("GoogleClientId");
export const googleClientSecret = new sst.Secret("GoogleClientSecret");

export const oauth2 = new sst.Linkable("Oauth2", {
  properties: {
    entraId: {
      clientId: entraIdApplication.clientId,
      clientSecret: entraIdClientSecret.value,
    },
    google: {
      clientId: googleClientId.value,
      clientSecret: googleClientSecret.value,
    },
  },
});

export const auth = new sst.aws.Auth("Auth", {
  authorizer: {
    handler: "packages/functions/node/src/authorizer.handler",
    link: [dsqlCluster, oauth2],
    architecture: "arm64",
  },
  domain: {
    name: $interpolate`auth.${appFqdn}`,
    dns: sst.cloudflare.dns(),
  },
});

export const entraIdApplicationRedirectUris =
  new azuread.ApplicationRedirectUris("EntraIdApplicationRedirectUris", {
    applicationId: entraIdApplication.id,
    type: "Web",
    redirectUris: [$interpolate`${auth.url}/callback`],
  });
