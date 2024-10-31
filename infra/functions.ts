import { db } from "./db";
import {
  appData,
  cloud,
  cloudfrontPrivateKey,
  cloudfrontPublicKey,
} from "./misc";
import { organization } from "./organization";
import { realtime } from "./realtime";
import {
  codeBucket,
  ordersProcessorDeadLetterQueue,
  pulumiBucket,
} from "./storage";
import { link, normalizePath } from "./utils";
import { web } from "./web";

sst.Linkable.wrap(sst.aws.Function, (fn) => ({
  properties: {
    name: fn.name,
    arn: fn.arn,
    invokeArn: fn.nodes.function.invokeArn,
    roleArn: fn.nodes.role.arn,
  },
  include: [
    {
      type: "aws.permission",
      actions: ["lambda:InvokeFunction"],
      resources: [fn.arn],
    },
  ],
}));

export const usersSync = new sst.aws.Function("UsersSync", {
  handler: "packages/functions/handlers/node/src/users-sync.handler",
  timeout: "20 seconds",
  link: [appData, cloudfrontPrivateKey, db],
});
new aws.lambda.Permission("UsersSyncSchedulePermission", {
  function: usersSync.name,
  action: "lambda:InvokeFunction",
  principal: "scheduler.amazonaws.com",
  principalOrgId: organization.id,
});
new aws.lambda.Permission("UsersSyncRulePermission", {
  function: usersSync.name,
  action: "lambda:InvokeFunction",
  principal: "events.amazonaws.com",
  principalOrgId: organization.id,
});

export const ordersProcessor = new sst.aws.Function("OrdersProcessor", {
  handler: "packages/functions/handlers/node/src/orders-processor.handler",
  timeout: "20 seconds",
  link: [appData, cloudfrontPrivateKey, db, ordersProcessorDeadLetterQueue],
});
new aws.lambda.Permission("OrdersProcessorRulePermission", {
  function: ordersProcessor.name,
  action: "lambda:InvokeFunction",
  principal: "events.amazonaws.com",
  principalOrgId: organization.id,
});

export const dbGarbageCollection = new sst.aws.Cron("DbGarbageCollection", {
  job: {
    handler:
      "packages/functions/handlers/node/src/db-garbage-collection.handler",
    timeout: "10 seconds",
    link: [db],
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
const tailscaleLayerBuilderAssetPath = "dist/package.zip";
const tailscaleLayerBuilder = new command.local.Command(
  "TailscaleLayerBuilder",
  {
    dir: tailscaleLayerSrcPath,
    create: "./build-with-docker.sh",
    assetPaths: [tailscaleLayerBuilderAssetPath],
    triggers: [tailscaleLayerSrc.archive],
  },
);
export const tailscaleLayerObject = new aws.s3.BucketObjectv2(
  "TailscaleLayerObject",
  {
    bucket: codeBucket.name,
    key: "functions/layers/tailscale/package.zip",
    source: tailscaleLayerBuilder.assets.apply((assets) => {
      const asset = assets?.[tailscaleLayerBuilderAssetPath];
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
const papercutSecureBridgeHandlerBuilderAssetPath = "bin/package.zip";
const papercutSecureBridgeHandlerBuilder = new command.local.Command(
  "PapercutSecureBridgeHandlerBuilder",
  {
    dir: papercutSecureBridgeHandlerSrcPath,
    create:
      "GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bin/bootstrap cmd/function/main.go && zip -j bin/package.zip bin/bootstrap",
    assetPaths: [papercutSecureBridgeHandlerBuilderAssetPath],
    triggers: [papercutSecureBridgeHandlerSrc.archive],
  },
);
export const papercutSecureBridgeHandlerObject = new aws.s3.BucketObjectv2(
  "PapercutSecureBridgeHandlerObject",
  {
    bucket: codeBucket.name,
    key: "functions/handlers/papercut-secure-bridge/package.zip",
    source: papercutSecureBridgeHandlerBuilder.assets.apply((assets) => {
      const asset = assets?.[papercutSecureBridgeHandlerBuilderAssetPath];
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
  command: 'echo "Archiving tenant infra handler source code..."',
  archivePaths: [
    "src/tenant/infra/**",
    "!src/tenant/infra/dist/**",
    "package.json",
  ],
});
const tenantInfraHandlerBuilder = new command.local.Command(
  "TenantInfraHandlerBuilder",
  {
    dir: nodeHandlersPath,
    create: "pnpm run infra:build",
    triggers: [tenantInfraHandlerSrc.archive],
  },
);

export const repository = new awsx.ecr.Repository("Repository", {
  forceDelete: true,
});

export const tenantInfraFunctionImage = new awsx.ecr.Image(
  "TenantInfraFunctionImage",
  {
    repositoryUrl: repository.url,
    context: normalizePath("packages/functions/handlers/node/src/tenant/infra"),
  },
  { dependsOn: [tenantInfraHandlerBuilder] },
);

export const tenantInfraFunctionRole = new aws.iam.Role(
  "TenantInfraFunctionRole",
  {
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
    managedPolicyArns: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole],
  },
);

new aws.iam.RolePolicy("TenantInfraFunctionRoleInlinePolicy", {
  role: tenantInfraFunctionRole.name,
  policy: aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        actions: ["s3:*"],
        resources: [pulumiBucket.arn, $interpolate`${pulumiBucket.arn}/*`],
      },
    ],
  }).json,
});

export const tenantInfraFunction = new aws.lambda.Function(
  "TenantInfraFunction",
  {
    imageUri: tenantInfraFunctionImage.imageUri,
    role: tenantInfraFunctionRole.arn,
    ...link({
      AppData: appData.properties,
      Cloud: cloud.properties,
      CloudfrontPublicKey: cloudfrontPublicKey.properties,
      Code: code.properties,
      OrdersProcessor: ordersProcessor.getSSTLink().properties,
      PulumiBucket: pulumiBucket.getSSTLink().properties,
      Realtime: realtime.properties,
      UsersSync: usersSync.getSSTLink().properties,
      Web: web.getSSTLink().properties,
    }),
  },
);
