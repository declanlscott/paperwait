import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "../resource";

export interface PapercutSecureBridgeArgs {
  accountId: aws.organizations.Account["id"];
}

export class PapercutSecureBridge extends pulumi.ComponentResource {
  private static instance: PapercutSecureBridge;

  private role: aws.iam.Role;
  private tailscaleLayer: aws.lambda.LayerVersion;
  private function: aws.lambda.Function;

  public static getInstance(
    args: PapercutSecureBridgeArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    if (!this.instance) this.instance = new PapercutSecureBridge(args, opts);

    return this.instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof PapercutSecureBridge.getInstance>
  ) {
    super(
      `${resource.AppData.name}:aws:PapercutSecureBridgeFunction`,
      "PapercutSecureBridgeFunction",
      args,
      opts,
    );

    this.role = new aws.iam.Role(
      "Role",
      {
        assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              effect: "Allow",
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
      { ...opts, parent: this },
    );

    new aws.iam.RolePolicyAttachment(
      "BasicExecutionPolicyAttachment",
      {
        role: this.role,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      },
      { ...opts, parent: this },
    );

    new aws.iam.RolePolicy(
      "InlinePolicy",
      {
        role: this.role,
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              effect: "Allow",
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
      { ...opts, parent: this },
    );

    this.tailscaleLayer = new aws.lambda.LayerVersion(
      "TailscaleLayer",
      {
        code: new pulumi.asset.FileArchive("TODO"),
        layerName: "tailscale",
        compatibleRuntimes: [aws.lambda.Runtime.CustomAL2023],
        compatibleArchitectures: ["arm64"],
      },
      { ...opts, parent: this },
    );

    this.function = new aws.lambda.Function(
      "Function",
      {
        code: new pulumi.asset.FileArchive("TODO"),
        runtime: aws.lambda.Runtime.CustomAL2023,
        architectures: ["arm64"],
        layers: [this.tailscaleLayer.arn],
        role: this.role.arn,
      },
      { ...opts, parent: this },
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
