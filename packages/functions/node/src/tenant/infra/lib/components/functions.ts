import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export class Functions extends pulumi.ComponentResource {
  static #instance: Functions;

  #papercutSecureReverseProxy: PapercutSecureReverseProxy;

  static getInstance(opts: pulumi.ComponentResourceOptions) {
    if (!this.#instance) this.#instance = new Functions(opts);

    return this.#instance;
  }

  private constructor(...[opts]: Parameters<typeof Functions.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Functions`, "Functions", {}, opts);

    this.#papercutSecureReverseProxy = PapercutSecureReverseProxy.getInstance({
      parent: this,
    });
  }

  get papercutSecureReverseProxy() {
    return this.#papercutSecureReverseProxy;
  }
}

class PapercutSecureReverseProxy extends pulumi.ComponentResource {
  static #instance: PapercutSecureReverseProxy;

  #role: FunctionRole;
  #function: aws.lambda.Function;

  static getInstance(opts: pulumi.ComponentResourceOptions) {
    if (!this.#instance) this.#instance = new PapercutSecureReverseProxy(opts);

    return this.#instance;
  }

  private constructor(
    ...[opts]: Parameters<typeof PapercutSecureReverseProxy.getInstance>
  ) {
    const { AppData, Code } = useResource();

    super(
      `${AppData.name}:tenant:aws:PapercutSecureReverseProxy`,
      "PapercutSecureReverseProxy",
      {},
      opts,
    );

    const region = aws.getRegionOutput({}, { parent: this }).name;
    const accountId = aws.getCallerIdentityOutput(
      {},
      { parent: this },
    ).accountId;

    this.#role = new FunctionRole("PapercutSecureReverseProxy", {
      parent: this,
    });
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

    this.#function = new aws.lambda.Function(
      "Function",
      {
        s3Bucket: Code.bucket.name,
        s3Key: Code.bucket.object.papercutSecureReverseProxy.key,
        s3ObjectVersion:
          Code.bucket.object.papercutSecureReverseProxy.versionId,
        runtime: aws.lambda.Runtime.CustomAL2023,
        architectures: ["arm64"],
        timeout: 15,
        role: this.#role.arn,
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
