import { Constants } from "@printworks/core/utils/constants";
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

  #role: aws.iam.Role;
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

    this.#role = new aws.iam.Role(
      "Role",
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: "lambda.amazonaws.com",
        }),
        managedPolicyArns: [aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole],
      },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "RoleInlinePolicy",
      {
        role: this.#role.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["ssm:GetParameter", "kms:Decrypt"],
                resources: [
                  Constants.PAPERCUT_SERVER_URL_PARAMETER_NAME,
                  Constants.TAILSCALE_OAUTH_CLIENT_PARAMETER_NAME,
                ].map(
                  (name) =>
                    pulumi.interpolate`arn:aws:ssm:${aws.getRegionOutput({}, { parent: this }).name}:${
                      aws.getCallerIdentityOutput({}, { parent: this })
                        .accountId
                    }:parameter${name}`,
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
        timeout: 20,
        role: this.#role.arn,
      },
      { parent: this },
    );

    this.registerOutputs({
      role: this.#role.id,
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
