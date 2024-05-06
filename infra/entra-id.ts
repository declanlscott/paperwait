import { AUTH_CALLBACK_PATH, HOST } from "@paperwait/core/constants";

$linkable(azuread.Application, function () {
  return {
    properties: {
      clientId: this.clientId,
    },
  };
});

$linkable(azuread.ApplicationPassword, function () {
  return {
    properties: {
      value: this.value,
    },
  };
});

export const entraIdApp = new azuread.Application("EntraIdApplication", {
  displayName: "Paperwait",
  preventDuplicateNames: true,
  signInAudience: "AzureADMultipleOrgs",
  web: {
    redirectUris: [
      `http://${HOST.WEB.DEV}${AUTH_CALLBACK_PATH}`,
      `https://${HOST.WEB.PROD}${AUTH_CALLBACK_PATH}}`,
    ],
  },
});

// export const entraIdAppIdUri = new entraId.ApplicationIdentifierUri(
//   "EntraIdApplicationIdentifierUri",
//   {
//     applicationId: entraIdApp.id,
//     identifierUri: `api://paperwait`,
//   },
// );

export const rotationHours = 24 * 7 * 26; // 6 months
export const clientSecretRotation = new versetime.Rotating(
  "ClientSecretRotation",
  { rotationHours },
);

export const entraIdClientSecret = new azuread.ApplicationPassword(
  "EntraIdClientSecret",
  {
    applicationObjectId: entraIdApp.id,
    endDateRelative: `${rotationHours.toString()}h`,
    rotateWhenChanged: {
      rotation: clientSecretRotation.id,
    },
  },
);

export const servicePrincipal = new azuread.ServicePrincipal(
  "EntraIdServicePrincipal",
  { clientId: entraIdApp.clientId },
);
