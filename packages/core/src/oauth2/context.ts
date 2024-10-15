import { Utils } from "../utils";

import type { SessionTokens } from "../sessions/sql";
import type { Oauth2Provider } from "./sql";

export type Oauth2Context = {
  provider: Pick<Oauth2Provider, "variant" | "id"> &
    Pick<SessionTokens, "accessToken">;
};
export const Oauth2Context = Utils.createContext<Oauth2Context>("Oauth2");

export const useOauth2 = Oauth2Context.use;

export const withOauth2 = <
  TOauth2Context extends Oauth2Context,
  TCallback extends () => ReturnType<TCallback>,
>(
  context: TOauth2Context,
  callback: TCallback,
) => Oauth2Context.with(context, callback);
