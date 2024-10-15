import {
  generateCodeVerifier,
  generateState,
  Google as GoogleProvider,
} from "arctic";
import { Resource } from "sst";
import * as v from "valibot";

import { Constants } from "../constants";
import { HttpError, InternalServerError, NotImplemented } from "../errors/http";
import { Utils } from "../utils";
import { GOOGLE } from "./shared";

import type { Oauth2 } from ".";
import type { SessionTokens } from "../sessions/sql";
import type { User } from "../users/sql";

export namespace Google {
  export const provider = new GoogleProvider(
    Resource.Oauth2.google.clientId,
    Resource.Oauth2.google.clientSecret,
    Resource.AppData.isDev
      ? `http://localhost:4321${Constants.AUTH_CALLBACK_PATH}`
      : `https://${Resource.AppData.domainName.fullyQualified}${Constants.AUTH_CALLBACK_PATH}`,
  );

  export function createAuthorizationUrl(hostedDomain: string) {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const authorizationUrl = provider.createAuthorizationURL(
      state,
      codeVerifier,
      ["profile", "email"],
    );

    authorizationUrl.searchParams.set("hd", hostedDomain);

    return { authorizationUrl, state, codeVerifier };
  }

  export const validateAuthorizationCode = async (
    code: string,
    codeVerifier: string,
  ) => provider.validateAuthorizationCode(code, codeVerifier);

  export async function getUserInfo(accessToken: string) {
    const res = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) throw new HttpError(res.statusText, res.status);

    return v.parse(
      v.looseObject({
        sub: v.string(),
        name: v.string(),
        picture: v.string(),
        email: v.string(),
        given_name: v.optional(v.string()),
      }),
      await res.json(),
    );
  }

  export async function parseIdToken(
    idToken: SessionTokens["idToken"],
  ): Promise<Oauth2.IdToken> {
    const payload = await Utils.parseJwt(idToken);
    if (!payload) throw new InternalServerError("Empty id token payload");

    const { hd, sub, name } = v.parse(
      v.object({ hd: v.string(), sub: v.string(), name: v.string() }),
      payload,
    );

    return {
      providerId: hd,
      userId: sub,
      username: name,
    };
  }

  export const refreshAccessToken = async (
    refreshToken: NonNullable<SessionTokens["refreshToken"]>,
  ) => provider.refreshAccessToken(refreshToken);

  // TODO: Implement this function
  export async function photo(_userId: User["id"]): Promise<Response> {
    throw new NotImplemented(`Provider variant "${GOOGLE}" not implemented`);
  }
}
