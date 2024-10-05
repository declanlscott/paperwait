import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "../resource";

export interface StorageArgs {
  tenantId: string;
}

export class Storage extends pulumi.ComponentResource {
  private static instance: Storage;

  private documentsBucket: Bucket;
  private assetsBucket: Bucket;

  public static getInstance(
    args: StorageArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Storage {
    if (!this.instance) this.instance = new Storage(args, opts);

    return this.instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Storage.getInstance>) {
    super(`${resource.AppData.name}:aws:Storage`, "Storage", args, opts);

    this.documentsBucket = new Bucket(
      "Documents",
      { tenantId: args.tenantId },
      { ...opts, parent: this },
    );

    this.assetsBucket = new Bucket(
      "Assets",
      { tenantId: args.tenantId, withCloudfront: true },
      { ...opts, parent: this },
    );
  }

  public get documents() {
    return this.documentsBucket;
  }

  public get assets() {
    return this.assetsBucket;
  }
}

interface BucketArgs {
  tenantId: string;
  withCloudfront?: boolean;
}

class Bucket extends pulumi.ComponentResource {
  private bucket: aws.s3.Bucket;
  private publicAccessBlock: aws.s3.BucketPublicAccessBlock;
  private policy: aws.s3.BucketPolicy;

  public constructor(
    name: string,
    args: BucketArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    super(`${resource.AppData.name}:aws:Bucket`, name, {}, opts);

    this.bucket = new aws.s3.Bucket(
      `${name}Bucket`,
      {
        bucket: `${name.toLowerCase()}.${args.tenantId}.${resource.AppData.domainName.fullyQualified}`,
        forceDestroy: true,
      },
      { ...opts, parent: this },
    );

    new aws.s3.BucketVersioningV2(
      `${name}Versioning`,
      {
        bucket: this.bucket.bucket,
        versioningConfiguration: { status: "Enabled" },
      },
      { ...opts, parent: this },
    );

    this.publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      `${name}PublicAccessBlock`,
      {
        bucket: this.bucket.bucket,
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      { ...opts, parent: this },
    );

    const statements: pulumi.Input<
      Array<aws.types.input.iam.GetPolicyDocumentStatementArgs>
    > = [];

    statements.push({
      effect: "Deny",
      principals: [{ type: "*", identifiers: ["*"] }],
      actions: ["s3:*"],
      resources: [this.bucket.arn, pulumi.interpolate`${this.bucket.arn}/*`],
      conditions: [
        {
          test: "Bool",
          variable: "aws:SecureTransport",
          values: ["false"],
        },
      ],
    });

    if (args.withCloudfront) {
      statements.push({
        principals: [
          { type: "Service", identifiers: ["withCloudfront.amazonaws.com"] },
        ],
        actions: ["s3:GetObject"],
        resources: [pulumi.interpolate`${this.bucket.arn}/*`],
      });
    }

    this.policy = new aws.s3.BucketPolicy(
      `${name}Policy`,
      {
        bucket: this.bucket.bucket,
        policy: aws.iam.getPolicyDocumentOutput({
          statements,
        }).json,
      },
      { ...opts, parent: this, dependsOn: this.publicAccessBlock },
    );

    new aws.s3.BucketCorsConfigurationV2(
      `${name}Cors`,
      {
        bucket: this.bucket.bucket,
        corsRules: [
          {
            allowedHeaders: ["*"],
            allowedOrigins: ["*"],
            allowedMethods: ["DELETE", "GET", "HEAD", "POST", "PUT"],
            maxAgeSeconds: 0,
          },
        ],
      },
      { ...opts, parent: this },
    );

    this.registerOutputs({
      bucket: this.bucket.id,
      publicAccessBlock: this.publicAccessBlock.id,
      policy: this.policy.id,
    });
  }

  public get url() {
    return pulumi.interpolate`https://${this.bucket.bucketRegionalDomainName}`;
  }

  public get name() {
    return this.bucket.bucket;
  }

  public get arn() {
    return this.bucket.arn;
  }
}
