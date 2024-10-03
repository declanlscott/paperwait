import { db } from "./db";
import { appData, cloud } from "./misc";
import { realtime } from "./realtime";
import { pulumiBackendBucket } from "./storage";
import { normalizePath } from "./utils";
import { webOutputs } from "./web";

export const dbGarbageCollection = new sst.aws.Cron("DbGarbageCollection", {
  job: {
    handler:
      "packages/functions/handlers/node/src/db-garbage-collection.handler",
    timeout: "10 seconds",
    link: [appData, db],
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
    triggers: [secureBridgeHandlerSrcAsset],
  },
);

const nodeHandlersPath = "packages/functions/handlers/node";
export const buildTenantInfraHandler = new command.local.Command(
  "BuildTenantInfraHandler",
  {
    dir: normalizePath(nodeHandlersPath),
    create: "pnpm run tenant-infra:build",
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

export const tenantInfraRole = new aws.iam.Role("TenantInfraRole", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "lambda.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  },
});
new aws.iam.RolePolicyAttachment("TenantInfraBasicExecutionAttachment", {
  role: tenantInfraRole,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

export const tenantInfraFunction = new aws.lambda.Function(
  "TenantInfraFunction",
  {
    imageUri: tenantInfraImage.imageUri,
    role: tenantInfraRole.arn,
    environment: {
      variables: {
        CUSTOM_RESOURCE_AppData: $jsonStringify(
          appData.getSSTLink().properties,
        ),
        CUSTOM_RESOURCE_Cloud: $jsonStringify(cloud.getSSTLink().properties),
        CUSTOM_RESOURCE_PulumiBackendBucket: $jsonStringify(
          pulumiBackendBucket.getSSTLink().properties,
        ),
        CUSTOM_RESOURCE_Realtime: $jsonStringify(
          realtime.getSSTLink().properties,
        ),
        CUSTOM_RESOURCE_WebOutputs: $jsonStringify(
          webOutputs.getSSTLink().properties,
        ),
      },
    },
  },
);
