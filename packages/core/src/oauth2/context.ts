import { createContext } from "../context";

import type { OAuth2ProviderData } from "./types";

export type OAuth2Context = {
  provider: OAuth2ProviderData;
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
