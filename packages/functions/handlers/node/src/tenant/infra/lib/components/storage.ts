import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

type Buckets = Record<"assets" | "documents", Bucket>;
type Queues = Record<"orderProcessor", Queue>;

export class Storage extends pulumi.ComponentResource {
  static #instance: Storage;

  #buckets: Buckets = {} as Buckets;
  #queues: Queues = {} as Queues;

  static getInstance(opts: pulumi.ComponentResourceOptions): Storage {
    if (!this.#instance) this.#instance = new Storage(opts);

    return this.#instance;
  }

  private constructor(...[opts]: Parameters<typeof Storage.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Storage`, "Storage", {}, opts);

    this.#buckets.assets = new Bucket("Assets", { parent: this });

    this.#buckets.documents = new Bucket("Documents", { parent: this });

    this.#queues.orderProcessor = new Queue(
      "OrderProcessor",
      {
        withDlq: true,
        fifo: { enabled: true, deduplication: true },
      },
      { parent: this },
    );
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
      { parent: this },
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
        policy: aws.iam.getPolicyDocumentOutput({
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
        }).json,
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

  get url() {
    return pulumi.interpolate`https://${this.#bucket.bucketRegionalDomainName}`;
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
      this.#dlq = new aws.sqs.Queue(`${name}Dlq`, {}, { parent: this });

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
      { parent: this },
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
