import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { handler as tailscaleAuthKeyRotationHandler } from "src/tenant/tailscale-auth-key-rotation";

import { link, useResource } from "../resource";

export class Functions extends pulumi.ComponentResource {
  static #instance: Functions;

  #papercutSecureBridge: PapercutSecureBridge;
  #tailscaleAuthKeyRotation: TailscaleAuthKeyRotation;

  static getInstance(opts: pulumi.ComponentResourceOptions) {
    if (!this.#instance) this.#instance = new Functions(opts);

    return this.#instance;
  }

  private constructor(...[opts]: Parameters<typeof Functions.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Functions`, "Functions", {}, opts);

    this.#papercutSecureBridge = PapercutSecureBridge.getInstance({
      parent: this,
    });

    this.#tailscaleAuthKeyRotation = TailscaleAuthKeyRotation.getInstance({
      parent: this,
    });
  }

  get papercutSecureBridge() {
    return this.#papercutSecureBridge;
  }

  get tailscaleAuthKeyRotation() {
    return this.#tailscaleAuthKeyRotation;
  }
}

class PapercutSecureBridge extends pulumi.ComponentResource {
  static #instance: PapercutSecureBridge;

  #role: FunctionRole;
  #tailscaleLayer: aws.lambda.LayerVersion;
  #function: aws.lambda.Function;

  static getInstance(opts: pulumi.ComponentResourceOptions) {
    if (!this.#instance) this.#instance = new PapercutSecureBridge(opts);

    return this.#instance;
  }

  private constructor(
    ...[opts]: Parameters<typeof PapercutSecureBridge.getInstance>
  ) {
    const { AppData, Code } = useResource();

    super(
      `${AppData.name}:tenant:aws:PapercutSecureBridge`,
      "PapercutSecureBridge",
      {},
      opts,
    );

    const region = aws.getRegionOutput({}, { parent: this }).name;
    const accountId = aws.getCallerIdentityOutput(
      {},
      { parent: this },
    ).accountId;

    this.#role = new FunctionRole("PapercutSecureBridge", { parent: this });
    new aws.iam.RolePolicy(
      "InlinePolicy",
      {
        role: this.#role.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["ssm:GetParameter"],
                resources: [
                  [AppData.name, AppData.stage, "tailscale", "auth"].join("/"),
                  [
                    AppData.name,
                    AppData.stage,
                    "papercut",
                    "web-services",
                  ].join("/"),
                ].map(
                  (parameter) =>
                    pulumi.interpolate`arn:aws:ssm:${region}:${accountId}:parameter/${parameter}`,
                ),
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.#tailscaleLayer = new aws.lambda.LayerVersion(
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

    this.#function = new aws.lambda.Function(
      "Function",
      {
        s3Bucket: Code.bucket.name,
        s3Key: Code.bucket.object.papercutSecureBridgeHandler.key,
        s3ObjectVersion:
          Code.bucket.object.papercutSecureBridgeHandler.versionId,
        runtime: aws.lambda.Runtime.CustomAL2023,
        architectures: ["arm64"],
        layers: [this.#tailscaleLayer.arn],
        role: this.#role.arn,
        ...link({ AppData }),
      },
      { parent: this },
    );

    this.registerOutputs({
      tailscaleLayer: this.#tailscaleLayer.id,
      function: this.#function.id,
    });
  }

  get functionArn() {
    return this.#function.arn;
  }

  get invokeArn() {
    return this.#function.invokeArn;
  }
}

class TailscaleAuthKeyRotation extends pulumi.ComponentResource {
  static #instance: TailscaleAuthKeyRotation;

  #role: FunctionRole;
  #function: aws.lambda.CallbackFunction<
    Parameters<typeof tailscaleAuthKeyRotationHandler>,
    ReturnType<typeof tailscaleAuthKeyRotationHandler>
  >;

  static getInstance(opts: pulumi.ComponentResourceOptions) {
    if (!this.#instance) this.#instance = new TailscaleAuthKeyRotation(opts);

    return this.#instance;
  }

  private constructor(
    ...[opts]: Parameters<typeof TailscaleAuthKeyRotation.getInstance>
  ) {
    const { AppData } = useResource();

    super(
      `${AppData.name}:tenant:aws:TailscaleAuthKeyRotation`,
      "TailscaleAuthKeyRotation",
      {},
      opts,
    );

    const region = aws.getRegionOutput({}, { parent: this }).name;
    const accountId = aws.getCallerIdentityOutput(
      {},
      { parent: this },
    ).accountId;

    this.#role = new FunctionRole("TailscaleAuthKeyRotation", { parent: this });
    new aws.iam.RolePolicy(
      "InlinePolicy",
      {
        role: this.#role.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["ssm:GetParameter"],
                resources: [
                  [
                    AppData.name,
                    AppData.stage,
                    "tailscale",
                    "oauth-client",
                  ].join("/"),
                  [AppData.name, AppData.stage, "tailscale", "tailnet"].join(
                    "/",
                  ),
                ].map(
                  (parameter) =>
                    pulumi.interpolate`arn:aws:ssm:${region}:${accountId}:parameter/${parameter}`,
                ),
              },
              {
                actions: ["ssm:PutParameter"],
                resources: [
                  pulumi.interpolate`arn:aws:ssm:${region}:${accountId}:parameter/${AppData.name}/${AppData.stage}/tailscale/auth`,
                ],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.#function = new aws.lambda.CallbackFunction(
      "CallbackFunction",
      {
        callback: tailscaleAuthKeyRotationHandler,
        runtime: aws.lambda.Runtime.NodeJS20dX,
        architectures: ["arm64"],
        role: this.#role.arn,
        ...link({ AppData }),
      },
      { parent: this },
    );

    this.registerOutputs({
      function: this.#function.id,
    });
  }

  get functionArn() {
    return this.#function.arn;
  }

  get invokeArn() {
    return this.#function.invokeArn;
  }
}

class FunctionRole extends pulumi.ComponentResource {
  #role: aws.iam.Role;

  constructor(name: string, opts: pulumi.ComponentResourceOptions) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:FunctionRole`, name, {}, opts);

    this.#role = new aws.iam.Role(
      `${name}Role`,
      {
        assumeRolePolicy: aws.iam.getPolicyDocumentOutput(
          {
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
          },
          { parent: this },
        ).json,
        managedPolicyArns: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole],
      },
      { parent: this },
    );

    this.registerOutputs({
      role: this.#role.id,
    });
  }

  get name() {
    return this.#role.name;
  }

  get arn() {
    return this.#role.arn;
  }
}
