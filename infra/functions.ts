import { db } from "./db";
import { cloud, meta } from "./misc";
import { realtime } from "./realtime";
import { pulumiBackendBucket } from "./storage";
import { normalizePath } from "./utils";

export const dbGarbageCollection = new sst.aws.Cron("DbGarbageCollection", {
  job: {
    handler:
      "packages/functions/handlers/node/src/db-garbage-collection.handler",
    timeout: "10 seconds",
    link: [db, meta],
  },
  schedule: "rate(1 day)",
});

export const tailscaleLayerSrcAsset = $asset(
  "packages/functions/layers/tailscale/src",
);
export const buildTailscaleLayer = new command.local.Command(
  "BuildTailscaleLayer",
  {
    dir: tailscaleLayerSrcAsset.path,
    create: "./build-with-docker.sh",
    delete: "rm -rf ../dist",
    triggers: [tailscaleLayerSrcAsset],
  },
);

export const secureBridgeHandlerSrcAsset = $asset(
  "packages/functions/handlers/go/papercut-secure-bridge/src",
);
export const buildSecureBridgeHandler = new command.local.Command(
  "BuildSecureBridgeHandler",
  {
    dir: secureBridgeHandlerSrcAsset.path,
    create:
      "GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o ../bin/bootstrap cmd/function/main.go && zip -j ../bin/function.zip ../bin/bootstrap",
    delete: "rm -rf ../bin",
    triggers: [secureBridgeHandlerSrcAsset],
  },
);

const nodeHandlersPath = "packages/functions/handlers/node";
export const buildTenantInfraHandler = new command.local.Command(
  "BuildTenantInfraHandler",
  {
    dir: normalizePath(nodeHandlersPath),
    create: "pnpm run tenant-infra:build",
    delete: "rm -rf dist/tenant-infra",
    triggers: [
      $asset(normalizePath("src/tenant-infra", nodeHandlersPath)),
      $asset(normalizePath("package.json", nodeHandlersPath)),
    ],
  },
);

export const repository = new awsx.ecr.Repository("Repository", {
  forceDelete: true,
});

export const tenantInfraImage = new awsx.ecr.Image(
  "Image",
  {
    repositoryUrl: repository.url,
    context: normalizePath("packages/functions/handlers/node/src/tenant-infra"),
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
