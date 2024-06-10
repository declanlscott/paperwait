import { AUTH_CALLBACK_PATH } from "@paperwait/core/constants";
import { Google } from "arctic";
import { Resource } from "sst";

export default new Google(
  Resource.GoogleClientId.value,
  Resource.GoogleClientSecret.value,
  Resource.ClientIsDev.value === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `${Resource.ClientDomain.value}${AUTH_CALLBACK_PATH}`,
);
