import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { handler as tailscaleAuthKeyRotationHandler } from "src/tenant/tailscale-auth-key-rotation";

import { useResource } from "../resource";

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
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Functions`, "Functions", args, opts);

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

  private role: FunctionRole;
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
    const { AppData, Cloud, Code } = useResource();

    super(
      `${AppData.name}:tenant:aws:PapercutSecureBridge`,
      "PapercutSecureBridge",
      args,
      opts,
    );

    this.role = new FunctionRole("PapercutSecureBridge", { parent: this });
    new aws.iam.RolePolicy(
      "InlinePolicy",
      {
        role: this.role.name,
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["ssm:GetParameter"],
              resources: [
                pulumi.interpolate`/${AppData.name}/${AppData.stage}/tailscale/auth`,
                pulumi.interpolate`/${AppData.name}/${AppData.stage}/papercut/web-services`,
              ].map(
                (parameter) =>
                  pulumi.interpolate`arn:aws:ssm:${Cloud.aws.region}:${args.accountId}:parameter${parameter}`,
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
        s3Bucket: Code.bucket.name,
        s3Key: Code.bucket.object.tailscaleLayer.key,
        s3ObjectVersion: Code.bucket.object.tailscaleLayer.versionId,
        layerName: "tailscale",
        compatibleRuntimes: [aws.lambda.Runtime.CustomAL2023],
        compatibleArchitectures: ["arm64"],
      },
      { parent: this },
    );

    this.function = new aws.lambda.Function(
      "Function",
      {
        s3Bucket: Code.bucket.name,
        s3Key: Code.bucket.object.papercutSecureBridgeHandler.key,
        s3ObjectVersion:
          Code.bucket.object.papercutSecureBridgeHandler.versionId,
        runtime: aws.lambda.Runtime.CustomAL2023,
        architectures: ["arm64"],
        layers: [this.tailscaleLayer.arn],
        role: this.role.arn,
        environment: {
          variables: {
            CUSTOM_RESOURCE_AppData: JSON.stringify(AppData),
          },
        },
      },
      { parent: this },
    );

    this.registerOutputs({
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

  private role: FunctionRole;
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
    const { AppData, Cloud } = useResource();

    super(
      `${AppData.name}:tenant:aws:TailscaleAuthKeyRotation`,
      "TailscaleAuthKeyRotation",
      args,
      opts,
    );

    this.role = new FunctionRole("TailscaleAuthKeyRotation", { parent: this });
    new aws.iam.RolePolicy(
      "InlinePolicy",
      {
        role: this.role.name,
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["ssm:GetParameter"],
              resources: [
                pulumi.interpolate`/${AppData.name}/${AppData.stage}/tailscale/oauth-client`,
                pulumi.interpolate`/${AppData.name}/${AppData.stage}/tailscale/tailnet`,
              ].map(
                (parameter) =>
                  pulumi.interpolate`arn:aws:ssm:${Cloud.aws.region}:${args.accountId}:parameter${parameter}`,
              ),
            },
            {
              actions: ["ssm:PutParameter"],
              resources: [
                pulumi.interpolate`arn:aws:ssm:${Cloud.aws.region}:${args.accountId}:parameter/${AppData.name}/${AppData.stage}/tailscale/auth`,
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
        role: this.role.arn,
      },
      { parent: this },
    );

    this.registerOutputs({
      function: this.function.id,
    });
  }

  public get functionArn() {
    return this.function.arn;
  }
}

class FunctionRole extends pulumi.ComponentResource {
  private role: aws.iam.Role;

  public constructor(name: string, opts: pulumi.ComponentResourceOptions) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:FunctionRole`, name, {}, opts);

    this.role = new aws.iam.Role(
      `${name}Role`,
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
      `${name}BasicExecutionPolicyAttachment`,
      {
        role: this.role,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      },
      { parent: this },
    );

    this.registerOutputs({
      role: this.role.id,
    });
  }

  public get name() {
    return this.role.name;
  }

  public get arn() {
    return this.role.arn;
  }
}
