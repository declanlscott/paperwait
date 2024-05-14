import { AUTH_CALLBACK_PATH } from "@paperwait/core/constants";

import { domain } from "./secrets";

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
      `http://localhost:4321${AUTH_CALLBACK_PATH}`,
      $interpolate`https://${domain.value}${AUTH_CALLBACK_PATH}`,
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
export const clientSecretRotation = new time.Rotating("ClientSecretRotation", {
  rotationHours,
});

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
