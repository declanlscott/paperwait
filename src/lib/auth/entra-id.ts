import { MicrosoftEntraId } from "arctic";
import { Resource } from "sst";

import { authRedirectPath, domain, localhost } from "~/utils/constants";
import { isDevEnv } from "~/utils/env";

export default new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  isDevEnv
    ? `http://${localhost}${authRedirectPath}`
    : `https://${domain}${authRedirectPath}`,
);
