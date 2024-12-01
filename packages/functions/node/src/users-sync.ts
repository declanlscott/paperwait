import { withActor } from "@printworks/core/actors";
import { Realtime } from "@printworks/core/realtime";
import { formatChannel } from "@printworks/core/realtime/shared";
import { Users } from "@printworks/core/users";
import * as v from "valibot";

import type { EventBridgeHandler } from "aws-lambda";

export const handler: EventBridgeHandler<string, unknown, void> = async (
  event,
) => {
  const channel = formatChannel("event", event.id);

  try {
    const { tenantId } = v.parse(
      v.object({ tenantId: v.string() }),
      event.detail,
    );

    await withActor({ type: "system", properties: { tenantId } }, Users.sync);
  } catch (e) {
    console.error(e);

    if (event["detail-type"] !== "Scheduled Event")
      await Realtime.publish(channel, [JSON.stringify({ success: false })]);

    throw e;
  }

  if (event["detail-type"] !== "Scheduled Event")
    await Realtime.publish(channel, [JSON.stringify({ success: true })]);
};
