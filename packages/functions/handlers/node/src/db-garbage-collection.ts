import * as Auth from "@paperwait/core/auth";
import * as Replicache from "@paperwait/core/replicache";

export const handler = async () =>
  Promise.all([
    Auth.deleteExpiredSessions(),
    Replicache.deleteExpiredClientGroups(),
    Replicache.deleteExpiredClients(),
  ]);
