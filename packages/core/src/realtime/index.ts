import * as R from "remeda";
import { Resource } from "sst";

import { Api } from "../api";
import { SignatureV4 } from "../utils/aws";

export namespace Realtime {
  export async function getUrl() {
    const domainName = await Api.getAppsyncRealtimeDomainName();

    return new URL(`wss://${domainName}/event/realtime`);
  }

  export async function getAuthProtocol() {
    // TODO: implement
  }

  export async function publish(channel: string, events: Array<string>) {
    const domainName = await Api.getAppsyncHttpDomainName();
    const url = new URL(`https://${domainName}/event`);

    const signer = SignatureV4.buildSigner({
      region: Resource.Aws.region,
      service: "appsync",
    });

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

      await fetch(url, {
        method: req.method,
        headers: req.headers,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: req.body,
      });
    }
  }
}
