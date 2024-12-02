import * as R from "remeda";
import { Resource } from "sst";

import { Api } from "../api";
import { SignatureV4, Sts } from "../utils/aws";

export namespace Realtime {
  export async function getUrl() {
    const domainName = await Api.getAppsyncRealtimeDomainName();

    return new URL(`wss://${domainName}/event/realtime`);
  }

  export async function getAuthProtocol() {
    const signer = SignatureV4.buildSigner({
      region: Resource.Aws.region,
      service: "appsync",
      credentials: await Sts.getAssumeRoleCredentials(new Sts.Client(), {
        type: "name",
        accountId: await Api.getAccountId(),
        roleName: Resource.Aws.tenant.realtimePublisherRole.name,
        roleSessionName: "RealtimePublisher",
      }),
    });

    // TODO: Finish implementation
  }

  export async function publish(channel: string, events: Array<string>) {
    const signer = SignatureV4.buildSigner({
      region: Resource.Aws.region,
      service: "appsync",
      credentials: await Sts.getAssumeRoleCredentials(new Sts.Client(), {
        type: "name",
        accountId: await Api.getAccountId(),
        roleName: Resource.Aws.tenant.realtimePublisherRole.name,
        roleSessionName: "RealtimePublisher",
      }),
    });

    const domainName = await Api.getAppsyncHttpDomainName();
    const url = new URL(`https://${domainName}/event`);

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
