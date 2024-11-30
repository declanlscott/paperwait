import { addMinutes } from "date-fns";
import * as R from "remeda";
import { Resource } from "sst";

import { Api } from "../api";
import { Tenants } from "../tenants";
import { Cloudfront, SignatureV4 } from "../utils/aws";

export namespace Realtime {
  export async function publish(channel: string, events: Array<string>) {
    const url = Cloudfront.buildUrl({
      fqdn: Tenants.getFqdn(),
      path: "/event",
    });

    const signer = SignatureV4.buildSigner({
      region: Resource.Aws.region,
      service: "appsync",
    });

    const keyPairId = await Api.getCloudfrontKeyPairId();

    for (const batch of R.chunk(events, 5)) {
      const req = await signer.sign({
        hostname: url.hostname,
        protocol: url.protocol,
        method: "POST",
        path: url.pathname,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          channel,
          events: batch,
        }),
      });

      await fetch(
        Cloudfront.getSignedUrl({
          keyPairId,
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
}
