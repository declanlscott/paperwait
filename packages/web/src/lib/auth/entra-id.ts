import { AUTH_REDIRECT_PATH, HOST } from "@paperwait/core/constants";
import { MicrosoftEntraId } from "arctic";
import { Resource } from "sst";

export default new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  import.meta.env.DEV
    ? `http://${HOST.WEB.DEV}${AUTH_REDIRECT_PATH}`
    : `https://${HOST.WEB.PROD}${AUTH_REDIRECT_PATH}`,
);
