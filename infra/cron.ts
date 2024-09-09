import { db } from "./db";
import { meta } from "./meta";

export const deleteExpiredSessions = new sst.aws.Cron("DeleteExpiredSessions", {
  job: {
    handler: "packages/functions/ts/src/delete-expired-sessions.handler",
    timeout: "10 seconds",
    link: [db, meta],
  },
  schedule: "rate(1 day)",
});
