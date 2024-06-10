import {
  InternalServerError,
  NotImplementedError,
} from "@paperwait/core/errors";
import { validate } from "@paperwait/core/valibot";
import * as v from "valibot";

import entraId from "~/api/lib/auth/providers/entra-id";
import google from "~/api/lib/auth/providers/google";

import type { Provider } from "@paperwait/core/organization";
import type { GoogleTokens, MicrosoftEntraIdTokens } from "arctic";

export type Tokens = MicrosoftEntraIdTokens | GoogleTokens;

export async function getTokens(
  provider: Provider,
  code: string,
  codeVerifier: string,
): Promise<Tokens> {
  switch (provider) {
    case "entra-id":
      return await entraId.validateAuthorizationCode(code, codeVerifier);
    case "google":
      return await google.validateAuthorizationCode(code, codeVerifier);
    default:
      provider satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${provider}" is not implemented`,
      );
  }
}

export type IdTokenPayload = {
  userProviderId: string;
  orgProviderId: string;
  username: string;
};

export function parseIdTokenPayload(
  provider: Provider,
  payload: unknown,
): IdTokenPayload {
  switch (provider) {
    case "entra-id": {
      const { tid, oid, preferred_username } = validate(
        v.object({
          tid: v.pipe(v.string(), v.uuid()),
          oid: v.pipe(v.string(), v.uuid()),
          preferred_username: v.string(),
        }),
        payload,
        {
          Error: InternalServerError,
          message: `Failed to parse ${provider} id token payload`,
        },
      );

      return {
        orgProviderId: tid,
        userProviderId: oid,
        username: preferred_username,
      };
    }
    case "google": {
      const { hd, sub, name } = validate(
        v.object({ hd: v.string(), sub: v.string(), name: v.string() }),
        payload,
        {
          Error: InternalServerError,
          message: `Failed to parse ${provider} id token payload`,
        },
      );

      return {
        orgProviderId: hd,
        userProviderId: sub,
        username: name,
      };
    }
    default: {
      provider satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${provider}" is not implemented`,
      );
    }
  }
}
