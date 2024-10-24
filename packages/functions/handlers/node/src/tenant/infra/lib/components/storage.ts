import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

type Buckets = Record<"assets" | "documents", Bucket>;

export class Storage extends pulumi.ComponentResource {
  static #instance: Storage;

  #buckets: Buckets = {} as Buckets;
  // TODO: Add queues

  static getInstance(opts: pulumi.ComponentResourceOptions): Storage {
    if (!this.#instance) this.#instance = new Storage(opts);

    return this.#instance;
  }

  private constructor(...[opts]: Parameters<typeof Storage.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Storage`, "Storage", {}, opts);

    this.#buckets.assets = new Bucket("Assets", { parent: this });

    this.#buckets.documents = new Bucket("Documents", { parent: this });
  }

  get buckets() {
    return this.#buckets;
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
