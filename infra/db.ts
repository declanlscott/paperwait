import { Dsql } from "./dynamic/dsql";
import { aws_ } from "./misc";

export const dsqlCluster = new Dsql.Cluster(
  "DsqlCluster",
  { deletionProtectionEnabled: $app.stage === "production" },
  { retainOnDelete: $app.stage === "production" },
);

export const endpoint = $interpolate`${dsqlCluster.id}.${aws_.properties.region}.on.aws`;

export const db = new sst.Linkable("Db", {
  properties: {
    postgres: {
      hostname: endpoint,
      database: "postgres",
      user: "admin",
      ssl: "require",
    },
  },
});

export const outputs = {
  dsql: endpoint,
};
