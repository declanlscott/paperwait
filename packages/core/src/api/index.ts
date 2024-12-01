import { addMinutes } from "date-fns";
import { Resource } from "sst";
import * as v from "valibot";

import { Tenants } from "../tenants";
import { Utils } from "../utils";
import { Cloudfront, SignatureV4 } from "../utils/aws";
import { HttpError } from "../utils/errors";

import type { StartsWith } from "../utils/types";

export namespace Api {
  export async function getAccountId() {
    const res = await send(
      `/.well-known/appspecific/${Utils.reverseDns(Tenants.getFqdn())}.account-id.txt`,
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return res.text();
  }

  export async function getCloudfrontKeyPairId() {
    const res = await send(
      `/.well-known/appspecific/${Utils.reverseDns(Tenants.getFqdn())}.cloudfront-key-pair-id.txt`,
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return res.text();
  }

  export async function syncUsers() {
    const res = await send("/users/sync", { method: "POST" });
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    const result = v.safeParse(
      v.object({
        Entries: v.array(
          v.object({
            ErrorCode: v.optional(v.string()),
            ErrorMessage: v.optional(v.string()),
            EventId: v.optional(v.string()),
          }),
        ),
        FailedEntryCount: v.number(),
      }),
      await res.json(),
    );
    if (!result.success)
      throw new HttpError.InternalServerError("Invalid sync users response");

    if (result.output.FailedEntryCount > 0)
      throw new HttpError.InternalServerError("Sync users event failure");

    const eventId = result.output.Entries.at(0)?.EventId;
    if (!eventId)
      throw new HttpError.InternalServerError("Missing sync users event id");

    return { eventId };
  }

  export async function invalidateCache(paths: Array<string>) {
    const res = await send("/cdn/invalidation", {
      method: "POST",
      body: JSON.stringify({ paths }),
    });
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);
  }

  export async function send<TPath extends string>(
    path: StartsWith<"/", TPath>,
    init?: RequestInit,
  ): Promise<Response> {
    const url = Cloudfront.buildUrl({
      fqdn: Tenants.getFqdn(),
      path: `/api${path}`,
    });

    const req = await SignatureV4.buildSigner({
      region: Resource.Aws.region,
      service: "execute-api",
    }).sign({
      hostname: url.hostname,
      protocol: url.protocol,
      method: init?.method ?? "GET",
      path: url.pathname,
      query: Object.fromEntries(
        new URLSearchParams(url.searchParams).entries(),
      ),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: init?.body?.toString(),
    });

    if (path.startsWith("/.well-known"))
      return fetch(url, {
        method: "GET",
        headers: req.headers,
      });

    return fetch(
      Cloudfront.getSignedUrl({
        keyPairId: await getCloudfrontKeyPairId(),
        privateKey: Resource.CloudfrontPrivateKey.pem,
        url: url.toString(),
        dateLessThan: addMinutes(Date.now(), 1).toISOString(),
      }),
      {
        method: req.method,
        headers: req.headers,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: req.body,
      },
    );
  }
}
