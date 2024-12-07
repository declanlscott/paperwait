import { Dsql } from "./dynamic/dsql";

export const dsqlCluster = new Dsql.Cluster(
  "DsqlCluster",
  { deletionProtectionEnabled: $app.stage === "production" },
  { retainOnDelete: $app.stage === "production" },
);

export const dbGarbageCollection = new sst.aws.Cron("DbGarbageCollection", {
  job: {
    handler: "packages/functions/node/src/db-garbage-collection.handler",
    timeout: "10 seconds",
    link: [dsqlCluster],
  },
  schedule: "rate(1 day)",
});

export const outputs = {
  dsql: dsqlCluster.endpoint,
};
