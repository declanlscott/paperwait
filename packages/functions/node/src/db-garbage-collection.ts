import { Replicache } from "@printworks/core/replicache";
import { Sessions } from "@printworks/core/sessions";

import type { EventBridgeHandler } from "aws-lambda";

export const handler: EventBridgeHandler<string, unknown, void> = async () => {
  await Promise.all([
    Sessions.deleteExpired(),
    Replicache.deleteExpiredClientGroups(),
    Replicache.deleteExpiredClients(),
  ]);
};
