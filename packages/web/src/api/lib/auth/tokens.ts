import {
  InternalServerError,
  NotImplementedError,
} from "@paperwait/core/errors";
import { fn } from "@paperwait/core/valibot";
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
      return fn(
        v.object({
          tid: v.pipe(v.string(), v.uuid()),
          oid: v.pipe(v.string(), v.uuid()),
          preferred_username: v.string(),
        }),
        ({ tid, oid, preferred_username }) => ({
          orgProviderId: tid,
          userProviderId: oid,
          username: preferred_username,
        }),
        {
          Error: InternalServerError,
          message: `Failed to parse ${provider} id token payload`,
        },
      )(payload);
    }
    case "google": {
      return fn(
        v.object({ hd: v.string(), sub: v.string(), name: v.string() }),
        ({ hd, sub, name }) => ({
          orgProviderId: hd,
          userProviderId: sub,
          username: name,
        }),
        {
          Error: InternalServerError,
          message: `Failed to parse ${provider} id token payload`,
        },
      )(payload);
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
