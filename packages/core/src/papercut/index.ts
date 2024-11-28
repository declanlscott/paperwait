import { TenantApi } from "../tenants/api";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";

export namespace Papercut {
  export async function getAuthToken() {
    const res = await TenantApi.send(
      `/parameters${Constants.PAPERCUT_SERVER_AUTH_TOKEN_PARAMETER_NAME}`,
      { method: "GET", headers: { "X-With-Decryption": "true" } },
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return res.text();
  }
}
