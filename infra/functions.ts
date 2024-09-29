import { db } from "./db";
import { cloud, meta } from "./misc";
import { realtime } from "./realtime";
import { pulumiBackendBucket } from "./storage";

export const dbGarbageCollection = new sst.aws.Cron("DbGarbageCollection", {
  job: {
    handler:
      "packages/functions/handlers/node/src/db-garbage-collection.handler",
    timeout: "10 seconds",
    link: [db, meta],
  },
  schedule: "rate(1 day)",
});

export const buildTailscaleLayer = new command.local.Command(
  "BuildTailscaleLayer",
  {
    create: "./build-with-docker.sh",
    dir: "packages/functions/layers/tailscale",
  },
);

export const buildSecureBridgeHandler = new command.local.Command(
  "BuildSecureBridgeHandler",
  {
    create: "./build.sh",
    dir: "packages/functions/handlers/go/papercut-secure-bridge",
  },
);

export const buildTenantInfraHandler = new command.local.Command(
  "BuildTenantInfraHandler",
  {
    create: "pnpm run build",
    dir: "packages/functions/handlers/node",
  },
);

export const repository = new awsx.ecr.Repository("Repository", {
  forceDelete: true,
});

export const tenantInfraImage = new awsx.ecr.Image(
  "Image",
  {
    repositoryUrl: repository.url,
    context: "packages/functions/handlers/node/src/tenant-infra",
  },
  {
    dependsOn: [
      buildTailscaleLayer,
      buildSecureBridgeHandler,
      buildTenantInfraHandler,
    ],
  },
);

export const tenantInfraFunction = new aws.lambda.Function(
  "TenantInfraFunction",
  {
    imageUri: tenantInfraImage.imageUri,
    role: "TODO",
    environment: {
      variables: {
        CUSTOM_RESOURCE_PulumiBackendBucket: $jsonStringify(
          pulumiBackendBucket.getSSTLink().properties,
        ),
        CUSTOM_RESOURCE_Meta: $jsonStringify(meta.getSSTLink().properties),
        CUSTOM_RESOURCE_Cloud: $jsonStringify(cloud.getSSTLink().properties),
        CUSTOM_RESOURCE_Realtime: $jsonStringify(
          realtime.getSSTLink().properties,
        ),
      },
    },
  },
);
