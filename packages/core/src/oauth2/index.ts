import { eq } from "drizzle-orm";

import { sessionsTokens } from "../auth/sql";
import { useTransaction } from "../drizzle/transaction";
import {
  InternalServerError,
  NotFoundError,
  NotImplementedError,
} from "../errors/http";
import * as EntraId from "./entra-id";
import * as Google from "./google";
import { ENTRA_ID, GOOGLE } from "./shared";
import { oauth2Providers } from "./sql";

import type { Authenticated } from "../auth";
import type { SessionTokens } from "../auth/sql";
import type { Oauth2Context } from "./context";
import type { Oauth2Tokens } from "./tokens";

export const fromSessionId = async (
  sessionId: Authenticated["session"]["id"],
): Promise<Oauth2Context["provider"]> =>
  useTransaction(async (tx) => {
    const provider = await tx
      .select({
        variant: oauth2Providers.variant,
        id: oauth2Providers.id,
        idToken: sessionsTokens.idToken,
        accessToken: sessionsTokens.accessToken,
        accessTokenExpiresAt: sessionsTokens.accessTokenExpiresAt,
        refreshToken: sessionsTokens.refreshToken,
      })
      .from(sessionsTokens)
      .innerJoin(
        oauth2Providers,
        eq(sessionsTokens.orgId, oauth2Providers.orgId),
      )
      .where(eq(sessionsTokens.sessionId, sessionId))
      .then((rows) => rows.at(0));
    if (!provider) throw new NotFoundError("Provider tokens not found");

    const expired =
      Date.now() > provider.accessTokenExpiresAt.getTime() - 10_000;

    if (!expired)
      return {
        variant: provider.variant,
        id: provider.id,
        accessToken: provider.accessToken,
      };

    if (!provider.refreshToken)
      throw new InternalServerError("Access token expired, no refresh token");

    let refreshed: Oauth2Tokens;
    switch (provider.variant) {
      case ENTRA_ID:
        refreshed = await EntraId.refreshAccessToken(provider.refreshToken);
        break;
      case GOOGLE:
        refreshed = await Google.refreshAccessToken(provider.refreshToken);
        break;
      default: {
        provider.variant satisfies never;

        throw new NotImplementedError(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `Provider variant "${provider.variant}" not implemented`,
        );
      }
    }

    const sessionTokens = {
      idToken: refreshed.idToken(),
      accessToken: refreshed.accessToken(),
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt(),
      refreshToken: refreshed.refreshToken(),
    } satisfies Pick<
      SessionTokens,
      "idToken" | "accessToken" | "accessTokenExpiresAt" | "refreshToken"
    >;

    await tx
      .update(sessionsTokens)
      .set(sessionTokens)
      .where(eq(sessionsTokens.sessionId, sessionId));

    return {
      variant: provider.variant,
      id: provider.id,
      accessToken: sessionTokens.accessToken,
    };
  });
