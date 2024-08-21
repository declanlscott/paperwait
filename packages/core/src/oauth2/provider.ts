import { createContext } from "../context";

import type { OAuth2ProviderData } from "./types";

type OAuth2Context = {
  provider: OAuth2ProviderData;
};
export const OAuth2Context = createContext<OAuth2Context>();

export function useOAuth2Provider(): OAuth2Context {
  try {
    return OAuth2Context.use();
  } catch {
    //
  }
}
