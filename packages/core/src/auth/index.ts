import { Oauth2Adapter } from "@openauthjs/openauth/adapter/oauth2";

import { Constants } from "../utils/constants";

import type { Oauth2WrappedConfig } from "@openauthjs/openauth/adapter/oauth2";

export namespace Auth {
  export interface EntraIdAdapterConfig extends Oauth2WrappedConfig {
    tenant: string;
  }

  export const entraIdAdapter = ({ tenant, ...config }: EntraIdAdapterConfig) =>
    Oauth2Adapter({
      ...config,
      type: Constants.ENTRA_ID,
      endpoint: {
        authorization: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        token: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      },
    });

  // TODO: Google provider
}
