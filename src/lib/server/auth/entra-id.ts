import { MicrosoftEntraId } from "arctic";
import env from "env";
import { Resource } from "sst";

import { AUTH_REDIRECT_PATH, LOCALHOST } from "~/utils/constants";
import { isDevEnv } from "~/utils/env";

export default new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  isDevEnv
    ? `http://${LOCALHOST}${AUTH_REDIRECT_PATH}`
    : `https://${env.DOMAIN}${AUTH_REDIRECT_PATH}`,
);
