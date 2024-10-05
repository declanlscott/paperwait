import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "../resource";

export interface RouterArgs {
  tenantId: string;
  origins: Array<aws.types.input.cloudfront.DistributionOrigin>;
}

export class Router extends pulumi.ComponentResource {
  private static instance: Router;

  private cachePolicy: aws.cloudfront.CachePolicy;
  private certificate: aws.acm.Certificate;
  private distribution: aws.cloudfront.Distribution;

  public static getInstance(
    args: RouterArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Router {
    if (!this.instance) this.instance = new Router(args, opts);

    return this.instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Router.getInstance>) {
    super(`${resource.AppData.name}:aws:Router`, "Router", args, opts);

    this.cachePolicy = new aws.cloudfront.CachePolicy(
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
      { ...opts, parent: this },
    );

    this.certificate = new aws.acm.Certificate(
      "Certificate",
      {
        domainName: `${args.tenantId}.${resource.AppData.domainName.fullyQualified}`,
        validationMethod: "DNS",
      },
      { ...opts, parent: this },
    );

    this.distribution = new aws.cloudfront.Distribution(
      "Distribution",
      {
        enabled: true,
        origins: [],
        defaultCacheBehavior: {
          targetOriginId: "/*",
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
          cachePolicyId: this.cachePolicy.id,
          // CloudFront's Managed-AllViewerExceptHostHeader policy
          originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
        },
        orderedCacheBehaviors: args.origins.map((origin) => ({
          targetOriginId: origin.originId,
        })),
      },
      { ...opts, parent: this },
    );
  }
}
