import { createContext } from "../utils/context";

import type { OmitTimestamps } from "../drizzle/columns";
import type { OAuth2Provider } from "./sql";

type OAuth2Context = {
  provider: OmitTimestamps<OAuth2Provider>;
};
export const OAuth2Context = createContext<OAuth2Context>();

export const useOAuth2Provider = () => OAuth2Context.use();
