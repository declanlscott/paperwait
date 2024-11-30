import { Constants } from "@printworks/core/utils/constants";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

type Buckets = Record<"assets" | "documents", Bucket>;
type Queues = Record<"invoicesProcessor", Queue>;

export class Storage extends pulumi.ComponentResource {
  static #instance: Storage;

  #buckets: Buckets = {} as Buckets;
  #queues: Queues = {} as Queues;
  #putParametersRole: aws.iam.Role;

  static getInstance(opts: pulumi.ComponentResourceOptions): Storage {
    if (!this.#instance) this.#instance = new Storage(opts);

    return this.#instance;
  }

  private constructor(...[opts]: Parameters<typeof Storage.getInstance>) {
    const { AppData, Aws, Web } = useResource();

    super(`${AppData.name}:tenant:aws:Storage`, "Storage", {}, opts);

    this.#buckets.assets = new Bucket("Assets", { parent: this });

    this.#buckets.documents = new Bucket("Documents", { parent: this });

    this.#queues.invoicesProcessor = new Queue(
      "InvoicesProcessor",
      {
        withDlq: true,
        fifo: { enabled: true, deduplication: true },
      },
      { parent: this },
    );

    this.#putParametersRole = new aws.iam.Role(
      "PutParametersRole",
      {
        name: Aws.tenant.putParametersRole.name,
        assumeRolePolicy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                principals: [
                  {
                    type: "AWS",
                    identifiers: [Web.server.role.principal],
                  },
                ],
                actions: ["sts:AssumeRole"],
                conditions:
                  Web.server.role.principal === "*"
                    ? [
                        {
                          test: "StringLike",
                          variable: "aws:PrincipalArn",
                          values: [
                            pulumi.interpolate`arn:aws:iam::${Aws.account.id}:role/*`,
                          ],
                        },
                      ]
                    : undefined,
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "PutParametersRoleInlinePolicy",
      {
        role: this.#putParametersRole.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["ssm:PutParameter"],
                resources: [
                  Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
                  Constants.DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME,
                  Constants.PAPERCUT_SERVER_URL_PARAMETER_NAME,
                  Constants.PAPERCUT_SERVER_AUTH_TOKEN_PARAMETER_NAME,
                  Constants.TAILSCALE_OAUTH_CLIENT_PARAMETER_NAME,
                ].map(
                  (name) =>
                    pulumi.interpolate`arn:aws:ssm::${aws.getCallerIdentityOutput({}, { parent: this })}:parameter${name}`,
                ),
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.registerOutputs({
      putParametersRole: this.#putParametersRole.id,
    });
  }

  get buckets() {
    return this.#buckets;
  }

  get queues() {
    return this.#queues;
  }
}

class Bucket extends pulumi.ComponentResource {
  #bucket: aws.s3.BucketV2;
  #publicAccessBlock: aws.s3.BucketPublicAccessBlock;
  #policy: aws.s3.BucketPolicy;

  constructor(name: string, opts: pulumi.ComponentResourceOptions) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Bucket`, name, {}, opts);

    this.#bucket = new aws.s3.BucketV2(
      `${name}Bucket`,
      { forceDestroy: true },
      { retainOnDelete: AppData.stage === "production", parent: this },
    );

    this.#publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      `${name}PublicAccessBlock`,
      {
        bucket: this.#bucket.bucket,
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      { parent: this },
    );

    this.#policy = new aws.s3.BucketPolicy(
      `${name}Policy`,
      {
        bucket: this.#bucket.bucket,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                principals: [
                  {
                    type: "Service",
                    identifiers: ["cloudfront.amazonaws.com"],
                  },
                ],
                actions: ["s3:GetObject"],
                resources: [pulumi.interpolate`${this.#bucket.arn}/*`],
              },
              {
                effect: "Deny",
                principals: [{ type: "*", identifiers: ["*"] }],
                actions: ["s3:*"],
                resources: [
                  this.#bucket.arn,
                  pulumi.interpolate`${this.#bucket.arn}/*`,
                ],
                conditions: [
                  {
                    test: "Bool",
                    variable: "aws:SecureTransport",
                    values: ["false"],
                  },
                ],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this, dependsOn: this.#publicAccessBlock },
    );

    new aws.s3.BucketCorsConfigurationV2(
      `${name}Cors`,
      {
        bucket: this.#bucket.bucket,
        corsRules: [
          {
            allowedHeaders: ["*"],
            allowedOrigins: ["*"],
            allowedMethods: ["DELETE", "GET", "HEAD", "POST", "PUT"],
            maxAgeSeconds: 0,
          },
        ],
      },
      { parent: this },
    );

    this.registerOutputs({
      bucket: this.#bucket.id,
      publicAccessBlock: this.#publicAccessBlock.id,
      policy: this.#policy.id,
    });
  }

  get regionalDomainName() {
    return this.#bucket.bucketRegionalDomainName;
  }

  get name() {
    return this.#bucket.bucket;
  }

  get arn() {
    return this.#bucket.arn;
  }
}

interface QueueArgs {
  withDlq?: boolean;
  fifo: { enabled: false } | { enabled: true; deduplication: boolean };
}

class Queue extends pulumi.ComponentResource {
  #dlq?: aws.sqs.Queue;
  #queue: aws.sqs.Queue;

  constructor(
    name: string,
    args: QueueArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Queue`, name, args, opts);

    if (args.withDlq)
      this.#dlq = new aws.sqs.Queue(
        `${name}Dlq`,
        {},
        { retainOnDelete: AppData.stage === "production", parent: this },
      );

    this.#queue = new aws.sqs.Queue(
      `${name}Queue`,
      {
        fifoQueue: args.fifo.enabled,
        contentBasedDeduplication: args.fifo.enabled
          ? args.fifo.deduplication
          : undefined,
        visibilityTimeoutSeconds: 30,
        redrivePolicy:
          args.withDlq && this.#dlq
            ? pulumi.jsonStringify({
                deadLetterTargetArn: this.#dlq.arn,
                maxReceiveCount: 3,
              })
            : undefined,
      },
      { retainOnDelete: AppData.stage === "production", parent: this },
    );

    this.registerOutputs({
      dlq: this.#dlq?.id,
      queue: this.#queue.id,
    });
  }

  get arn() {
    return this.#queue.arn;
  }

  get name() {
    return this.#queue.name;
  }

  get url() {
    return this.#queue.url;
  }
}
