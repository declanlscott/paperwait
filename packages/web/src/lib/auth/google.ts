import { AUTH_CALLBACK_PATH, HOST } from "@paperwait/core/constants";
import { Google } from "arctic";
import { Resource } from "sst";

export default new Google(
  Resource.GoogleClientId.value,
  Resource.GoogleClientSecret.value,
  Resource.ClientIsDev.value === "true"
    ? `http://${HOST.WEB.DEV}${AUTH_CALLBACK_PATH}`
    : `https://${HOST.WEB.PROD}${AUTH_CALLBACK_PATH}`,
);
