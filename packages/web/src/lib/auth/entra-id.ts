import { AUTH_CALLBACK_PATH, HOST } from "@paperwait/core/constants";
import { MicrosoftEntraId } from "arctic";
import { Resource } from "sst";

export default new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  Resource.ClientIsDev.value === "true"
    ? `http://${HOST.WEB.DEV}${AUTH_CALLBACK_PATH}`
    : `https://${HOST.WEB.PROD}${AUTH_CALLBACK_PATH}`,
);
