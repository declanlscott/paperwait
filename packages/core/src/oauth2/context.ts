import { createContext } from "../utils/context";

import type { SessionTokens } from "../auth/sql";
import type { OAuth2Provider } from "./sql";

export type OAuth2Context = {
  provider: Pick<OAuth2Provider, "variant" | "id"> &
    Pick<SessionTokens, "accessToken">;
};
export const OAuth2Context = createContext<OAuth2Context>();

export const useOAuth2 = OAuth2Context.use;

export const withOAuth2 = <
  TOAuth2Context extends OAuth2Context,
  TCallback extends () => ReturnType<TCallback>,
>(
  context: TOAuth2Context,
  callback: TCallback,
) => OAuth2Context.with(context, callback);
