import { AsyncLocalStorage } from "node:async_hooks";
import { createDecipheriv } from "node:crypto";

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

  export function parseResource<TResource extends Record<string, unknown>>(
    prefix: string,
    crypto: { key: string; iv: string },
    input: Record<string, string | undefined> = process.env,
  ): TResource {
    const raw = Object.entries(input).reduce(
      (raw, [key, value]) => {
        if (key.startsWith(prefix) && value) {
          const decipher = createDecipheriv(
            "aes-256-gcm",
            Buffer.from(crypto.key, "hex"),
            Buffer.from(crypto.iv, "hex"),
          );

          const data = Buffer.from(value, "base64").toString("hex");
          decipher.setAuthTag(Buffer.from(data.slice(-32), "hex"));

          raw[key.slice(prefix.length)] = JSON.parse(
            decipher.update(data.slice(0, -32), "hex", "utf-8") +
              decipher.final("utf-8"),
          );
        }

        return raw;
      },
      {} as Record<string, unknown>,
    );

    return new Proxy(raw, {
      get(target, prop: string) {
        if (prop in target) return target[prop];

        throw new Error(`Resource "${prop}" not linked.`);
      },
    }) as TResource;
  }
}
