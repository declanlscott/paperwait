import { databaseUrl } from "./database";

export const deleteExpiredSessions = new sst.aws.Cron("DeleteExpiredSessions", {
  job: {
    handler: "packages/functions/src/delete-expired-sessions.handler",
    timeout: "10 seconds",
    link: [databaseUrl],
    environment: {
      PROD: String($app.stage === "production"),
    },
  },
  schedule: "rate(1 day)",
});
