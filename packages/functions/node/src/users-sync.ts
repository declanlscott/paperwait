import { withActor } from "@printworks/core/actors/context";
import { Api } from "@printworks/core/api";
import { Realtime } from "@printworks/core/realtime";
import { formatChannel } from "@printworks/core/realtime/shared";
import { Users } from "@printworks/core/users";
import { SignatureV4, Sts, withAws } from "@printworks/core/utils/aws";
import { Resource } from "sst";
import * as v from "valibot";

import type { EventBridgeHandler } from "aws-lambda";

export const handler: EventBridgeHandler<string, unknown, void> = async (
  event,
) => {
  const { tenantId } = v.parse(
    v.object({ tenantId: v.string() }),
    event.detail,
  );

  const channel = formatChannel("event", event.id);

  return withActor({ type: "system", properties: { tenantId } }, async () =>
    withAws(
      async () => ({
        sigv4: {
          signer: SignatureV4.buildSigner({
            region: Resource.Aws.region,
            service: "appsync",
            credentials: await Sts.getAssumeRoleCredentials({
              type: "name",
              accountId: await Api.getAccountId(),
              roleName: Resource.Aws.tenant.realtimePublisherRole.name,
              roleSessionName: "UsersSync",
            }),
          }),
        },
      }),
      async () => {
        try {
          await Users.sync();
        } catch (e) {
          console.error(e);

          if (event["detail-type"] !== "Scheduled Event")
            await Realtime.publish(channel, [
              JSON.stringify({ success: false }),
            ]);

          throw e;
        }

        await Realtime.publish(channel, [JSON.stringify({ success: true })]);
      },
      () => ({ sts: { client: new Sts.Client() } }),
    ),
  );
};
