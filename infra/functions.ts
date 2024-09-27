import { db } from "./db";
import { cloud, meta } from "./misc";
import { realtime } from "./realtime";
import {
  pulumiBackendBucket,
  tenantInfraQueue,
  tenantInfraTimeout,
} from "./storage";

export const dbGarbageCollection = new sst.aws.Cron("DbGarbageCollection", {
  job: {
    handler:
      "packages/functions/handlers/node/src/db-garbage-collection.handler",
    timeout: "10 seconds",
    link: [db, meta],
  },
  schedule: "rate(1 day)",
});

tenantInfraQueue.subscribe({
  python: {
    container: true,
  },
  runtime: "python3.12",
  handler: "packages/functions/handlers/python/tenant-infra/src/main.handler",
  timeout: tenantInfraTimeout,
  architecture: "arm64",
  link: [cloud, meta, pulumiBackendBucket, realtime],
});
