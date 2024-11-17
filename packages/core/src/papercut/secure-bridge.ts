import { addMinutes } from "date-fns";
import { Resource } from "sst";
import * as v from "valibot";

import { Cloudfront } from "../utils/aws";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";
import {
  getTaskStatusResponseSchema,
  listUserAccountsResponseSchema,
} from "./shared";

import type { Tenant } from "../tenants/sql";

// TODO: Reimplement for secure reverse proxy

export namespace SecureBridge {
  export async function getTaskStatus(tenantId: Tenant["id"]) {
    const tenantFqdn = `${tenantId}.${Resource.AppData.domainName.fullyQualified}`;

    const signedUrl = Cloudfront.getSignedUrl({
      keyPairId: await Cloudfront.getKeyPairId(tenantFqdn),
      privateKey: Resource.CloudfrontPrivateKey.pem,
      url: Cloudfront.buildUrl(tenantFqdn, [
        "api",
        "papercut",
        "secure-bridge",
        "getTaskStatus",
      ]),
      dateLessThan: addMinutes(Date.now(), 1).toISOString(),
    });

    const res = await fetch(signedUrl, { method: "GET" });
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    const taskStatus = v.parse(
      getTaskStatusResponseSchema,
      await res.json(),
    ).struct;

    return taskStatus;
  }

  export async function listUserAccounts(tenantId: Tenant["id"]) {
    const tenantFqdn = `${tenantId}.${Resource.AppData.domainName.fullyQualified}`;

    const signedUrl = Cloudfront.getSignedUrl({
      keyPairId: await Cloudfront.getKeyPairId(tenantFqdn),
      privateKey: Resource.CloudfrontPrivateKey.pem,
      url: Cloudfront.buildUrl(tenantFqdn, [
        "api",
        "papercut",
        "secure-bridge",
        "listUserAccounts",
      ]),
      dateLessThan: addMinutes(Date.now(), 15).toISOString(),
    });

    const all: Array<string> = [];
    const limit = Constants.PAPERCUT_API_PAGINATION_LIMIT;
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await fetch(signedUrl, {
        method: "POST",
        body: JSON.stringify({ offset, limit }),
      });
      if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

      const userAccounts = v.parse(
        listUserAccountsResponseSchema,
        await res.json(),
      ).userAccounts;

      all.push(...userAccounts);

      offset += limit;
      hasMore = userAccounts.length === limit;
    } while (hasMore);

    return all;
  }
}
