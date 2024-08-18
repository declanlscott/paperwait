import { postgres } from "./db";

export const deleteExpiredSessions = new sst.aws.Cron("DeleteExpiredSessions", {
  job: {
    handler: "packages/functions/src/delete-expired-sessions.handler",
    timeout: "10 seconds",
    link: Object.values(postgres.credentials),
    environment: {
      PROD: String($app.stage === "production"),
    },
  },
  schedule: "rate(1 day)",
});
