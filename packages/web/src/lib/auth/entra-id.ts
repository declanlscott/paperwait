import { AUTH_CALLBACK_PATH } from "@paperwait/core/constants";
import { MicrosoftEntraId } from "arctic";
import { Resource } from "sst";

export default new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  Resource.ClientIsDev.value === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `${Resource.ClientDomain.value}${AUTH_CALLBACK_PATH}`,
);
