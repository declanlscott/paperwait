import { addMinutes } from "date-fns";
import { Resource } from "sst";

import { useTenant } from "../actors";
import { Cloudfront } from "../utils/aws";

import type { StartsWith } from "../utils/types";

export namespace TenantApi {
  export async function send<TPath extends string>(
    path: StartsWith<"/", TPath>,
    init?: RequestInit,
  ) {
    const tenantFqdn = `${useTenant().id}.${Resource.AppData.domainName.fullyQualified}`;

    const signedUrl = Cloudfront.getSignedUrl({
      keyPairId: await Cloudfront.getKeyPairId(tenantFqdn),
      privateKey: Resource.CloudfrontPrivateKey.pem,
      url: Cloudfront.buildUrl(tenantFqdn, `/api${path}`),
      dateLessThan: addMinutes(Date.now(), 1).toISOString(),
    });

    return fetch(signedUrl, init);
  }
}
