import { withContext } from "./lib/context";
import { send } from "./lib/realtime";
import { rotateAuthKey } from "./lib/tailscale";

import type { EventBridgeHandler } from "aws-lambda";

export const handler: EventBridgeHandler<string, unknown, void> = async (
  event,
  context,
) =>
  withContext(context, async () => {
    const channel = `event_${event.id}`;

    try {
      await rotateAuthKey();
    } catch (e) {
      console.error(e);

      if (event["detail-type"] !== "Scheduled Event")
        await send(channel, JSON.stringify({ success: false }));

      throw e;
    }

    if (event["detail-type"] !== "Scheduled Event")
      await send(channel, JSON.stringify({ success: true }));
  });
