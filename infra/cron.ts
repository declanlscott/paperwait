import { db } from "./db";

export const deleteExpiredSessions = new sst.aws.Cron("DeleteExpiredSessions", {
  job: {
    handler: "packages/functions/ts/src/delete-expired-sessions.handler",
    timeout: "10 seconds",
    link: [db],
    environment: {
      PROD: String($app.stage === "production"),
    },
  },
  schedule: "rate(1 day)",
});
