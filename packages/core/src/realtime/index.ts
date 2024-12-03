import { HttpRequest } from "@smithy/protocol-http";
import * as R from "remeda";
import { Resource } from "sst";

import { Api } from "../api";
import { SignatureV4, Sts, Util } from "../utils/aws";

export namespace Realtime {
  export const getUrl = async () =>
    Util.formatUrl(
      new HttpRequest({
        protocol: "wss:",
        hostname: await Api.getAppsyncRealtimeDomainName(),
        path: "/event/realtime",
      }),
    );

  export async function getAuthProtocol() {
    // TODO: Implement
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

    const hostname = await Api.getAppsyncHttpDomainName();

    for (const batch of R.chunk(events, 5)) {
      const req = await signer.sign(
        new HttpRequest({
          method: "POST",
          protocol: "https:",
          hostname,
          path: "/event",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel,
            events: batch,
          }),
        }),
      );

      await fetch(Util.formatUrl(req), {
        method: req.method,
        headers: req.headers,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: req.body,
      });
    }
  }
}
