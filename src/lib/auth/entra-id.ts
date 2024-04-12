import { MicrosoftEntraId } from "arctic";
import { Resource } from "sst";

import { AUTH_REDIRECT_PATH, DOMAIN, LOCALHOST } from "~/utils/constants";
import { isDevEnv } from "~/utils/env";

export default new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  isDevEnv
    ? `http://${LOCALHOST}${AUTH_REDIRECT_PATH}`
    : `https://${DOMAIN}${AUTH_REDIRECT_PATH}`,
);
