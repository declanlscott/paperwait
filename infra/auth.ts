import { domain } from "./misc";

const wellKnownOutput = azuread.getApplicationPublishedAppIdsOutput({});

const microsoftGraphAppId = wellKnownOutput.result?.MicrosoftGraph;

const { oauth2PermissionScopeIds } = new azuread.ServicePrincipal(
  "MicrosoftGraphServicePrincipal",
  {
    clientId: microsoftGraphAppId,
    useExisting: true,
  },
);

export const entraIdApplication = new azuread.Application(
  "EntraIdApplication",
  {
    displayName: "Paperwait",
    preventDuplicateNames: true,
    signInAudience: "AzureADMultipleOrgs",
    web: {
      redirectUris: [
        "http://localhost:4321/api/auth/callback",
        $interpolate`https://${domain.value}/api/auth/callback`,
      ],
    },
    requiredResourceAccesses: [
      {
        resourceAppId: microsoftGraphAppId,
        resourceAccesses: [
          {
            id: oauth2PermissionScopeIds["openid"],
            type: "Scope",
          },
          {
            id: oauth2PermissionScopeIds["profile"],
            type: "Scope",
          },
          {
            id: oauth2PermissionScopeIds["email"],
            type: "Scope",
          },
          {
            id: oauth2PermissionScopeIds["offline_access"],
            type: "Scope",
          },
          {
            id: oauth2PermissionScopeIds["User.Read"],
            type: "Scope",
          },
          {
            id: oauth2PermissionScopeIds["User.ReadBasic.All"],
            type: "Scope",
          },
        ],
      },
    ],
  },
);

export const rotationHours = 24 * 7 * 26; // 6 months
export const clientSecretRotation = new time.Rotating("ClientSecretRotation", {
  rotationHours,
});

export const entraIdClientSecret = new azuread.ApplicationPassword(
  "EntraIdClientSecret",
  {
    applicationObjectId: entraIdApplication.id,
    endDateRelative: `${rotationHours.toString()}h`,
    rotateWhenChanged: {
      rotation: clientSecretRotation.id,
    },
  },
);

export const servicePrincipal = new azuread.ServicePrincipal(
  "EntraIdServicePrincipal",
  { clientId: entraIdApplication.clientId },
);

export const googleClientId = new sst.Secret("GoogleClientId");

export const googleClientSecret = new sst.Secret("GoogleClientSecret");

export const auth = new sst.Linkable("Auth", {
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
