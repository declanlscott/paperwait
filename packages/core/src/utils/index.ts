import { AsyncLocalStorage } from "node:async_hooks";
import { privateDecrypt } from "node:crypto";

import {
  joseAlgorithmHS256,
  JWSRegisteredHeaders,
  JWTClaims,
  parseJWT,
} from "@oslojs/jwt";

import type { PrefixedRecord } from "./types";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function parseResource<TResource extends Record<string, any>>(
    prefix: string,
    privateKey: string,
    input: Record<string, string | undefined> = process.env,
  ): TResource {
    const raw = Object.entries(input).reduce(
      (raw, [key, value]) => {
        if (key.startsWith(prefix) && value)
          raw[key.slice(prefix.length)] = JSON.parse(
            privateDecrypt(privateKey, Buffer.from(value, "base64")).toString(
              "utf8",
            ),
          );

        return raw;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as Record<string, any>,
    );

    return new Proxy(raw, {
      get(target, prop: string) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (prop in target) return target[prop];

        throw new Error(`Resource "${prop}" not linked.`);
      },
    }) as TResource;
  }

  export function createPrefixedRecord<
    TKey extends string,
    TDelimiter extends string,
    TPrefix extends string,
  >(
    prefix: TPrefix,
    delimiter: TDelimiter,
    keys: Array<TKey>,
  ): PrefixedRecord<TPrefix, TDelimiter, TKey> {
    return keys.reduce(
      (prefixedRecord, key) => {
        prefixedRecord[key] = `${prefix}${delimiter}${key}`;

        return prefixedRecord;
      },
      {} as PrefixedRecord<TPrefix, TDelimiter, TKey>,
    );
  }
}
