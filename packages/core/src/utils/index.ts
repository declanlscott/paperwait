import { AsyncLocalStorage } from "node:async_hooks";

import {
  joseAlgorithmHS256,
  JWSRegisteredHeaders,
  JWTClaims,
  parseJWT,
} from "@oslojs/jwt";

export namespace Utils {
  export function createContext<TContext>(name: string) {
    const storage = new AsyncLocalStorage<TContext>();

    return {
      use: () => {
        const context = storage.getStore();
        if (!context) throw new Error(`${name} context not found`);

        return context;
      },
      with: <TCallback extends () => ReturnType<TCallback>>(
        context: TContext,
        callback: TCallback,
      ) => storage.run(context, callback),
    };
  }

  export async function parseJwt(jwt: string) {
    const [header, payload] = parseJWT(jwt);

    const headerParameters = new JWSRegisteredHeaders(header);
    if (headerParameters.algorithm() !== joseAlgorithmHS256)
      throw new Error("Unsupported algorithm");

    const claims = new JWTClaims(payload);
    if (claims.hasExpiration() && !claims.verifyExpiration())
      throw new Error("Expired token");
    if (claims.hasNotBefore() && !claims.verifyNotBefore())
      throw new Error("Invalid token");

    return payload;
  }
}
