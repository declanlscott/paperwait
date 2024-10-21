import { Replicache } from "@paperwait/core/replicache";
import { Sessions } from "@paperwait/core/sessions";

import type { EventBridgeHandler } from "aws-lambda";

export const handler: EventBridgeHandler<string, unknown, void> = async () => {
  await Promise.all([
    Sessions.deleteExpired(),
    Replicache.deleteExpiredClientGroups(),
    Replicache.deleteExpiredClients(),
  ]);
};
