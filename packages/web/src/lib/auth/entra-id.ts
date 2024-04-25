import {
  AUTH_REDIRECT_PATH,
  DOMAIN,
  LOCALHOST,
} from "@paperwait/core/constants";
import { MicrosoftEntraId } from "arctic";
import { Resource } from "sst";

export default new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  import.meta.env.DEV
    ? `http://${LOCALHOST.WEB}${AUTH_REDIRECT_PATH}`
    : `https://${DOMAIN.WEB}${AUTH_REDIRECT_PATH}`,
);
