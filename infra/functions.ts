import { db } from "./db";
import { appData, cloud } from "./misc";
import { realtime } from "./realtime";
import { codeBucket, pulumiBackendBucket } from "./storage";
import { injectLinkables, normalizePath } from "./utils";
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

const tailscaleLayerSrcPath = normalizePath(
  "packages/functions/layers/tailscale/src",
);
const tailscaleLayerSrc = await command.local.run({
  dir: tailscaleLayerSrcPath,
  command: 'echo "Archiving tailscale layer source code..."',
  archivePaths: ["**", "!dist/**"],
});
const tailscaleLayerBuildAssetPath = "dist/package.zip";
const tailscaleLayerBuild = new command.local.Command("TailscaleLayerBuild", {
  dir: tailscaleLayerSrcPath,
  create: "./build-with-docker.sh",
  assetPaths: [tailscaleLayerBuildAssetPath],
  triggers: [tailscaleLayerSrc.archive],
});
export const tailscaleLayerObject = new aws.s3.BucketObjectv2(
  "TailscaleLayerObject",
  {
    bucket: codeBucket.name,
    key: "functions/layers/tailscale/package.zip",
    source: tailscaleLayerBuild.assets.apply((assets) => {
      const asset = assets?.[tailscaleLayerBuildAssetPath];
      if (!asset) throw new Error("Missing tailscale layer build asset");

      return asset;
    }),
  },
);

const papercutSecureBridgeHandlerSrcPath = normalizePath(
  "packages/functions/handlers/go/papercut-secure-bridge",
);
const papercutSecureBridgeHandlerSrc = await command.local.run({
  dir: papercutSecureBridgeHandlerSrcPath,
  command: 'echo "Archiving papercut secure bridge handler source code..."',
  archivePaths: ["**", "!bin/**"],
});
const papercutSecureBridgeHandlerBuildAssetPath = "bin/package.zip";
const papercutSecureBridgeHandlerBuild = new command.local.Command(
  "PapercutSecureBridgeHandlerBuild",
  {
    dir: papercutSecureBridgeHandlerSrcPath,
    create:
      "GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bin/bootstrap cmd/function/main.go && zip -j bin/package.zip bin/bootstrap",
    assetPaths: [papercutSecureBridgeHandlerBuildAssetPath],
    triggers: [papercutSecureBridgeHandlerSrc.archive],
  },
);
export const papercutSecureBridgeHandlerObject = new aws.s3.BucketObjectv2(
  "PapercutSecureBridgeHandlerObject",
  {
    bucket: codeBucket.name,
    key: "functions/handlers/papercut-secure-bridge/package.zip",
    source: papercutSecureBridgeHandlerBuild.assets.apply((assets) => {
      const asset = assets?.[papercutSecureBridgeHandlerBuildAssetPath];
      if (!asset)
        throw new Error("Missing papercut secure bridge handler build asset");

      return asset;
    }),
  },
);

export const code = new sst.Linkable("Code", {
  properties: {
    bucket: {
      name: codeBucket.name,
      object: {
        tailscaleLayer: {
          key: tailscaleLayerObject.key,
          versionId: tailscaleLayerObject.versionId,
        },
        papercutSecureBridgeHandler: {
          key: papercutSecureBridgeHandlerObject.key,
          versionId: papercutSecureBridgeHandlerObject.versionId,
        },
      },
    },
  },
});

const nodeHandlersPath = normalizePath("packages/functions/handlers/node");
const tenantInfraHandlerSrc = await command.local.run({
  dir: nodeHandlersPath,
  command: 'echo "Archiving tenant-infra handler source code..."',
  archivePaths: [
    "src/tenant-infra/**",
    "!src/tenant-infra/dist/**",
    "package.json",
  ],
});
const tenantInfraHandlerBuild = new command.local.Command(
  "TenantInfraHandlerBuild",
  {
    dir: nodeHandlersPath,
    create: "pnpm run tenant-infra:build",
    triggers: [tenantInfraHandlerSrc.archive],
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
  { dependsOn: [tenantInfraHandlerBuild] },
);

export const tenantInfraRole = new aws.iam.Role("TenantInfraRole", {
  assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        principals: [
          {
            type: "Service",
            identifiers: ["lambda.amazonaws.com"],
          },
        ],
        actions: ["sts:AssumeRole"],
      },
    ],
  }).json,
});

new aws.iam.RolePolicyAttachment("TenantInfraBasicExecutionPolicyAttachment", {
  role: tenantInfraRole,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

new aws.iam.RolePolicy("TenantInfraInlinePolicy", {
  role: tenantInfraRole,
  policy: aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        actions: ["s3:*"],
        resources: [
          pulumiBackendBucket.arn,
          $interpolate`${pulumiBackendBucket.arn}/*`,
        ],
      },
    ],
  }).json,
});

export const tenantInfraFunction = new aws.lambda.Function(
  "TenantInfraFunction",
  {
    imageUri: tenantInfraImage.imageUri,
    role: tenantInfraRole.arn,
    environment: {
      variables: injectLinkables([
        appData,
        code,
        cloud,
        pulumiBackendBucket,
        realtime,
        webOutputs,
      ]),
    },
  },
);
