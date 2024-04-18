import {
  AUTH_REDIRECT_PATH,
  DOMAIN,
  LOCALHOST,
} from "@paperwait/core/constants";
import * as entraId from "@pulumi/azuread";
import * as time from "@pulumiverse/time";

$linkable(entraId.Application, function () {
  return {
    properties: {
      clientId: this.clientId,
    },
  };
});

$linkable(entraId.ApplicationPassword, function () {
  return {
    properties: {
      value: this.value,
    },
  };
});

export const entraIdApp = new entraId.Application("EntraIdApplication", {
  displayName: "Paperwait",
  preventDuplicateNames: true,
  signInAudience: "AzureADMultipleOrgs",
  web: {
    redirectUris: [
      `http://${LOCALHOST}${AUTH_REDIRECT_PATH}`,
      `https://${DOMAIN}${AUTH_REDIRECT_PATH}`,
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

export const entraIdClientSecret = new entraId.ApplicationPassword(
  "EntraIdClientSecret",
  {
    applicationObjectId: entraIdApp.id,
    endDateRelative: `${rotationHours.toString()}h`,
    rotateWhenChanged: {
      rotation: clientSecretRotation.id,
    },
  },
);

export const servicePrincipal = new entraId.ServicePrincipal(
  "EntraIdServicePrincipal",
  { clientId: entraIdApp.clientId },
);
