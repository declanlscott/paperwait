import { Replicache } from "@paperwait/core/replicache";
import { Sessions } from "@paperwait/core/sessions";

export const handler = async () =>
  Promise.all([
    Sessions.deleteExpired(),
    Replicache.deleteExpiredClientGroups(),
    Replicache.deleteExpiredClients(),
  ]);
