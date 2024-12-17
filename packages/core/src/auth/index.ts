import { Oauth2Adapter } from "@openauthjs/openauth/adapter/oauth2";

import { Constants } from "../utils/constants";
import { generateId } from "../utils/shared";

import type { Oauth2WrappedConfig } from "@openauthjs/openauth/adapter/oauth2";
import type { Tokens } from "@openauthjs/openauth/client";

export namespace Auth {
  export const generateSessionToken = generateId;

  export function buildTokensCookieAttributes(authTokens: Tokens) {
    const tokensCookieAttributes: Array<
      [
        string,
        string,
        {
          httpOnly: boolean;
          sameSite: "lax" | "strict" | "none";
          path: string;
          maxAge: number;
        },
      ]
    > = [];

    const tokens = { ...authTokens, session: generateSessionToken() };
    for (const tokenName in tokens)
      tokensCookieAttributes.push([
        `${tokenName}_token`,
        tokens[tokenName as keyof typeof tokens],
        {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 31449600, // 1 year
        },
      ]);

    return tokensCookieAttributes;
  }

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
