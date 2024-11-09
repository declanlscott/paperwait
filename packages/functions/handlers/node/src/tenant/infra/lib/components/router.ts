import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

const allViewerExceptHostHeaderPolicyName = "Managed-AllViewerExceptHostHeader";
const cachingOptimizedPolicyName = "Managed-CachingOptimized";
const cachingDisabledPolicyName = "Managed-CachingDisabled";

export interface RouterArgs {
  domainName: aws.acm.Certificate["domainName"];
  certificateArn: aws.acm.Certificate["arn"];
  keyPairId: pulumi.Input<string>;
  origins: Record<
    "api" | "assets" | "documents" | "appsyncHttp" | "appsyncRealtime",
    {
      domainName: pulumi.Input<string>;
      originPath?: pulumi.Input<string>;
    }
  >;
  realtimeApiKey: pulumi.Input<string>;
}

export class Router extends pulumi.ComponentResource {
  static #instance: Router;

  #keyGroup: aws.cloudfront.KeyGroup;
  #apiCachePolicy: aws.cloudfront.CachePolicy;
  #s3AccessControl: aws.cloudfront.OriginAccessControl;
  #realtimeViewerRequestFunction: aws.cloudfront.Function;
  #realtimeOriginRequestPolicy: aws.cloudfront.OriginRequestPolicy;
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

    this.#keyGroup = new aws.cloudfront.KeyGroup(
      "KeyGroup",
      { items: [args.keyPairId] },
      { parent: this },
    );

    this.#apiCachePolicy = new aws.cloudfront.CachePolicy(
      "ApiCachePolicy",
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

    this.#realtimeViewerRequestFunction = new aws.cloudfront.Function(
      "RealtimeViewerRequestFunction",
      {
        runtime: "cloudfront-js-2.0",
        code: pulumi.interpolate`
function handler(event) {
  const request = event.request;

  request.headers["Sec-Websocket-Protocol"] = {
    value:
      "aws-appsync-event-ws,header-" +
      getBase64URLEncoded({
        host: "${args.origins.appsyncHttp.domainName}",
        "X-Api-Key": "${args.realtimeApiKey}",
      }),
  };

  return request;
}

function getBase64URLEncoded(authorization) {
  return btoa(JSON.stringify(authorization))
    .replace(/\+/g, "-") // Convert '+' to '-'
    .replace(/\//g, "_") // Convert '/' to '_'
    .replace(/=+$/, ""); // Remove padding '='
}
`,
      },
      { parent: this },
    );

    this.#realtimeOriginRequestPolicy = new aws.cloudfront.OriginRequestPolicy(
      "RealtimeOriginRequestPolicy",
      {
        cookiesConfig: {
          cookieBehavior: "none",
        },
        headersConfig: {
          headerBehavior: "whitelist",
          headers: {
            items: ["Sec-WebSocket-Key", "Sec-WebSocket-Version"],
          },
        },
        queryStringsConfig: {
          queryStringBehavior: "none",
        },
      },
      { parent: this },
    );

    const urlCacheBehaviorConfig = {
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: [
        "GET",
        "HEAD",
        "OPTIONS",
        "PUT",
        "POST",
        "PATCH",
        "DELETE",
      ],
      cachedMethods: ["GET", "HEAD"],
      defaultTtl: 0,
      compress: true,
      cachePolicyId: this.#apiCachePolicy.id,
      originRequestPolicyId: aws.cloudfront
        .getOriginRequestPolicy(
          { name: allViewerExceptHostHeaderPolicyName },
          { parent: this },
        )
        .then((policy) => {
          if (!policy.id)
            throw new Error(
              `"${allViewerExceptHostHeaderPolicyName}" origin request policy not found`,
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

    const realtimeCacheBehaviorConfig = {
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: [],
      compress: false,
      defaultTtl: 0,
      cachePolicyId: aws.cloudfront
        .getCachePolicy({
          name: cachingDisabledPolicyName,
        })
        .then((policy) => {
          if (!policy.id)
            throw new Error(
              `"${cachingDisabledPolicyName}" cache policy not found`,
            );

          return policy.id;
        }),
      originRequestPolicyId: this.#realtimeOriginRequestPolicy.id,
      trustedKeyGroups: [this.#keyGroup.id],
      functionAssociations: [
        {
          functionArn: this.#realtimeViewerRequestFunction.arn,
          eventType: "viewer-request",
        },
      ],
    } satisfies BehaviorConfig;

    this.#distribution = new aws.cloudfront.Distribution(
      "Distribution",
      {
        enabled: true,
        aliases: [args.domainName],
        origins: [
          {
            originId: "/api/*",
            customOriginConfig,
            ...args.origins.api,
          },
          {
            originId: "/assets/*",
            originAccessControlId: this.#s3AccessControl.id,
            ...args.origins.assets,
          },
          {
            originId: "/documents/*",
            originAccessControlId: this.#s3AccessControl.id,
            ...args.origins.documents,
          },
          {
            originId: "/event",
            customOriginConfig,
            customHeaders: [
              {
                name: "X-Api-Key",
                value: args.realtimeApiKey,
              },
            ],
            ...args.origins.appsyncHttp,
          },
          {
            originId: "/event/realtime",
            customOriginConfig,
            ...args.origins.appsyncRealtime,
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
            pathPattern: "/api/.well-known/*",
            ...urlCacheBehaviorConfig,
            allowedMethods: ["GET", "HEAD", "OPTIONS"],
            defaultTtl: 31536000, // 1 year
            trustedKeyGroups: undefined,
          },
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
          {
            targetOriginId: "/event",
            pathPattern: "/event",
            ...urlCacheBehaviorConfig,
          },
          {
            targetOriginId: "/event/realtime",
            pathPattern: "/event/realtime",
            ...realtimeCacheBehaviorConfig,
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
          minimumProtocolVersion: "TLSv1.2_2021",
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
      keyGroup: this.#keyGroup.id,
      apiCachePolicy: this.#apiCachePolicy.id,
      s3AccessControl: this.#s3AccessControl.id,
      realtimeViewerRequestFunction: this.#realtimeViewerRequestFunction.id,
      realtimeOriginRequestPolicy: this.#realtimeOriginRequestPolicy.id,
      distribution: this.#distribution.id,
      cname: this.#cname.id,
    });
  }

  get distributionId() {
    return this.#distribution.id;
  }
}

type CustomOriginConfig =
  aws.types.input.cloudfront.DistributionOriginCustomOriginConfig;

type BehaviorConfig = Omit<
  | aws.types.input.cloudfront.DistributionDefaultCacheBehavior
  | aws.types.input.cloudfront.DistributionOrderedCacheBehavior,
  "targetOriginId" | "pathPattern"
>;
