import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "../../resource";
import { handler as tailscaleAuthKeyRotationHandler } from "./handlers/tailscale-auth-key-rotation";

export interface FunctionsArgs {
  accountId: aws.organizations.Account["id"];
}

export class Functions extends pulumi.ComponentResource {
  private static instance: Functions;

  private papercutSecureBridge: PapercutSecureBridge;
  private tailscaleAuthKeyRotation: TailscaleAuthKeyRotation;

  public static getInstance(
    args: FunctionsArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    if (!this.instance) this.instance = new Functions(args, opts);

    return this.instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof Functions.getInstance>
  ) {
    super(
      `${resource.AppData.name}:tenant:aws:Functions`,
      "Functions",
      args,
      opts,
    );

    this.papercutSecureBridge = PapercutSecureBridge.getInstance(args, {
      parent: this,
    });

    this.tailscaleAuthKeyRotation = TailscaleAuthKeyRotation.getInstance(args, {
      parent: this,
    });
  }

  public get papercutSecureBridgeArn() {
    return this.papercutSecureBridge.functionArn;
  }

  public get tailscaleAuthKeyRotationArn() {
    return this.tailscaleAuthKeyRotation.functionArn;
  }
}

class PapercutSecureBridge extends pulumi.ComponentResource {
  private static instance: PapercutSecureBridge;

  private role: aws.iam.Role;
  private tailscaleLayer: aws.lambda.LayerVersion;
  private function: aws.lambda.Function;

  public static getInstance(
    args: FunctionsArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    if (!this.instance) this.instance = new PapercutSecureBridge(args, opts);

    return this.instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof PapercutSecureBridge.getInstance>
  ) {
    super(
      `${resource.AppData.name}:tenant:aws:PapercutSecureBridge`,
      "PapercutSecureBridge",
      args,
      opts,
    );

    this.role = new aws.iam.Role(
      "Role",
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
      },
      { parent: this },
    );

    new aws.iam.RolePolicyAttachment(
      "BasicExecutionPolicyAttachment",
      {
        role: this.role,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      },
      { parent: this },
    );

    new aws.iam.RolePolicy(
      "InlinePolicy",
      {
        role: this.role,
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["ssm:GetParameter"],
              resources: [
                "paperwait/tailscale/auth-key",
                "paperwait/papercut/web-services/credentials",
              ].map(
                (name) =>
                  pulumi.interpolate`arn:aws:ssm:${resource.Cloud.aws.region}:${args.accountId}:parameter/${name}`,
              ),
            },
          ],
        }).json,
      },
      { parent: this },
    );

    this.tailscaleLayer = new aws.lambda.LayerVersion(
      "TailscaleLayer",
      {
        s3Bucket: resource.Code.bucket.name,
        s3Key: resource.Code.bucket.object.tailscaleLayer.key,
        s3ObjectVersion: resource.Code.bucket.object.tailscaleLayer.versionId,
        layerName: "tailscale",
        compatibleRuntimes: [aws.lambda.Runtime.CustomAL2023],
        compatibleArchitectures: ["arm64"],
      },
      { parent: this },
    );

    this.function = new aws.lambda.Function(
      "Function",
      {
        s3Bucket: resource.Code.bucket.name,
        s3Key: resource.Code.bucket.object.papercutSecureBridgeHandler.key,
        s3ObjectVersion:
          resource.Code.bucket.object.papercutSecureBridgeHandler.versionId,
        runtime: aws.lambda.Runtime.CustomAL2023,
        architectures: ["arm64"],
        layers: [this.tailscaleLayer.arn],
        role: this.role.arn,
      },
      { parent: this },
    );

    this.registerOutputs({
      role: this.role.id,
      tailscaleLayer: this.tailscaleLayer.id,
      function: this.function.id,
    });
  }

  public get functionArn() {
    return this.function.arn;
  }
}

class TailscaleAuthKeyRotation extends pulumi.ComponentResource {
  private static instance: TailscaleAuthKeyRotation;

  private role: aws.iam.Role;
  private function: aws.lambda.CallbackFunction<
    Parameters<typeof tailscaleAuthKeyRotationHandler>,
    ReturnType<typeof tailscaleAuthKeyRotationHandler>
  >;

  public static getInstance(
    args: FunctionsArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    if (!this.instance)
      this.instance = new TailscaleAuthKeyRotation(args, opts);

    return this.instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof TailscaleAuthKeyRotation.getInstance>
  ) {
    super(
      `${resource.AppData.name}:tenant:aws:TailscaleAuthKeyRotation`,
      "TailscaleAuthKeyRotation",
      args,
      opts,
    );

    this.role = new aws.iam.Role(
      "Role",
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
      },
      { parent: this },
    );

    new aws.iam.RolePolicyAttachment(
      "BasicExecutionPolicyAttachment",
      {
        role: this.role,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      },
      { parent: this },
    );

    new aws.iam.RolePolicy(
      "InlinePolicy",
      {
        role: this.role,
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["ssm:GetParameter"],
              resources: [
                pulumi.interpolate`arn:aws:ssm:${resource.Cloud.aws.region}:${args.accountId}:parameter/paperwait/tailscale/oauth2-client`,
              ],
            },
            {
              actions: ["ssm:PutParameter"],
              resources: [
                pulumi.interpolate`arn:aws:ssm:${resource.Cloud.aws.region}:${args.accountId}:parameter/paperwait/tailscale/auth-key`,
              ],
            },
          ],
        }).json,
      },
      { parent: this },
    );

    this.function = new aws.lambda.CallbackFunction(
      "CallbackFunction",
      {
        callback: tailscaleAuthKeyRotationHandler,
        runtime: aws.lambda.Runtime.NodeJS20dX,
        architectures: ["arm64"],
        role: this.role,
      },
      { parent: this },
    );

    this.registerOutputs({
      role: this.role.id,
      function: this.function.id,
    });
  }

  public get functionArn() {
    return this.function.arn;
  }
}
