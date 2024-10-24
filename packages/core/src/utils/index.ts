/**
 * NOTE: This module provides server utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import { AsyncLocalStorage } from "node:async_hooks";

import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
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

  export const hashToken = (token: string) =>
    encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

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
    input: Record<string, string | undefined>,
  ): TResource {
    const raw = Object.entries(input).reduce(
      (raw, [key, value]) => {
        if (key.startsWith(prefix) && value)
          raw[key.slice(prefix.length)] = JSON.parse(value);

        return raw;
      },
      {} as Record<string, unknown>,
    );

    return new Proxy(raw, {
      get(target, prop: string) {
        if (prop in target) return target[prop];

        throw new Error(`Resource "${prop}" is not linked.`);
      },
    }) as TResource;
  }

  export function reverseDns(domainName: string) {
    return domainName.split(".").reverse().join(".");
  }
}
