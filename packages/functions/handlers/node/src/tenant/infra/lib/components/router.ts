import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

const allViewerExceptHostHeaderPolicyName = "Managed-AllViewerExceptHostHeader";
const cachingOptimizedPolicyName = "Managed-CachingOptimized";

export interface RouterArgs {
  domainName: aws.acm.Certificate["domainName"];
  certificateArn: aws.acm.Certificate["arn"];
  keyPairId: pulumi.Input<string>;
  routes: Record<"api" | "assets" | "documents", { url: pulumi.Input<string> }>;
}

export class Router extends pulumi.ComponentResource {
  static #instance: Router;

  #cachePolicy: aws.cloudfront.CachePolicy;
  #keyGroup: aws.cloudfront.KeyGroup;
  #s3AccessControl: aws.cloudfront.OriginAccessControl;
  #distribution: aws.cloudfront.Distribution;
  #cname: cloudflare.Record;

  static getInstance(
    args: RouterArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Router {
    if (!this.#instance) this.#instance = new Router(args, opts);

    return this.#instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Router.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Router`, "Router", args, opts);

    this.#cachePolicy = new aws.cloudfront.CachePolicy(
      "CachePolicy",
      {
        defaultTtl: 0,
        minTtl: 0,
        maxTtl: 31536000, // 1 year
        parametersInCacheKeyAndForwardedToOrigin: {
          cookiesConfig: {
            cookieBehavior: "none",
          },
          headersConfig: {
            headerBehavior: "none",
          },
          queryStringsConfig: {
            queryStringBehavior: "all",
          },
          enableAcceptEncodingBrotli: true,
          enableAcceptEncodingGzip: true,
        },
      },
      { parent: this },
    );

    this.#keyGroup = new aws.cloudfront.KeyGroup(
      "KeyGroup",
      { items: [args.keyPairId] },
      { parent: this },
    );

    const customOriginConfig = {
      httpPort: 80,
      httpsPort: 443,
      originProtocolPolicy: "https-only",
      originReadTimeout: 30,
      originSslProtocols: ["TLSv1.2"],
    } satisfies CustomOriginConfig;

    this.#s3AccessControl = new aws.cloudfront.OriginAccessControl(
      "S3AccessControl",
      {
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
      { parent: this },
    );

    const urlCacheBehaviorConfig = {
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: [
        "DELETE",
        "GET",
        "HEAD",
        "OPTIONS",
        "PATCH",
        "POST",
        "PUT",
      ],
      cachedMethods: ["GET", "HEAD"],
      defaultTtl: 0,
      compress: true,
      cachePolicyId: this.#cachePolicy.id,
      originRequestPolicyId: aws.cloudfront
        .getOriginRequestPolicy(
          { name: allViewerExceptHostHeaderPolicyName },
          { parent: this },
        )
        .then((policy) => {
          if (!policy.id)
            throw new Error(
              `${allViewerExceptHostHeaderPolicyName} origin request policy not found`,
            );

          return policy.id;
        }),
      trustedKeyGroups: [this.#keyGroup.id],
    } satisfies BehaviorConfig;

    const bucketCacheBehaviorConfig = {
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      cachePolicyId: aws.cloudfront
        .getOriginRequestPolicy(
          { name: cachingOptimizedPolicyName },
          { parent: this },
        )
        .then((policy) => {
          if (!policy.id)
            throw new Error(
              `${cachingOptimizedPolicyName} cache policy not found`,
            );

          return policy.id;
        }),
      trustedKeyGroups: [this.#keyGroup.id],
    } satisfies BehaviorConfig;

    this.#distribution = new aws.cloudfront.Distribution(
      "Distribution",
      {
        enabled: true,
        aliases: [args.domainName],
        origins: [
          {
            originId: "/api/*",
            domainName: new URL(args.routes.api.url).hostname,
            customOriginConfig,
            originPath: `/${AppData.stage}`,
          },
          {
            originId: "/assets/*",
            domainName: new URL(args.routes.assets.url).hostname,
            originAccessControlId: this.#s3AccessControl.id,
          },
          {
            originId: "/documents/*",
            domainName: new URL(args.routes.documents.url).hostname,
            originAccessControlId: this.#s3AccessControl.id,
          },
          {
            originId: "/*",
            domainName: `does-not-exist.${AppData.domainName.value}`,
            customOriginConfig,
          },
        ],
        defaultCacheBehavior: {
          targetOriginId: "/*",
          ...urlCacheBehaviorConfig,
        },
        orderedCacheBehaviors: [
          {
            targetOriginId: "/api/*",
            pathPattern: "/api/*",
            ...urlCacheBehaviorConfig,
          },
          {
            targetOriginId: "/assets/*",
            pathPattern: "/assets/*",
            ...bucketCacheBehaviorConfig,
          },
          {
            targetOriginId: "/documents/*",
            pathPattern: "/documents/*",
            ...bucketCacheBehaviorConfig,
          },
        ],
        restrictions: {
          geoRestriction: {
            restrictionType: "none",
          },
        },
        viewerCertificate: {
          acmCertificateArn: args.certificateArn,
          sslSupportMethod: "sni-only",
          minimumProtocolVersion: "TLSv1.2#2021",
        },
        waitForDeployment: false,
      },
      { parent: this },
    );

    this.#cname = new cloudflare.Record(
      "Cname",
      {
        zoneId: cloudflare.getZoneOutput({
          name: AppData.domainName.value,
        }).id,
        name: args.domainName,
        type: "CNAME",
        value: this.#distribution.domainName,
        proxied: true,
      },
      { parent: this },
    );

    this.registerOutputs({
      cachePolicy: this.#cachePolicy.id,
      keyGroup: this.#keyGroup.id,
      s3AccessControl: this.#s3AccessControl.id,
      distribution: this.#distribution.id,
      cname: this.#cname.id,
    });
  }
}

type CustomOriginConfig =
  aws.types.input.cloudfront.DistributionOriginCustomOriginConfig;

type BehaviorConfig = Omit<
  | aws.types.input.cloudfront.DistributionDefaultCacheBehavior
  | aws.types.input.cloudfront.DistributionOrderedCacheBehavior,
  "targetOriginId" | "pathPattern"
>;
