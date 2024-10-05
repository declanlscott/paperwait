import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "../resource";

export interface RouterArgs {
  tenantId: string;
  routes: Record<"api" | "documents" | "assets", { url: pulumi.Input<string> }>;
}

export class Router extends pulumi.ComponentResource {
  private static instance: Router;

  private cachePolicy: aws.cloudfront.CachePolicy;
  private certificate: aws.acm.Certificate;
  private s3AccessControl: aws.cloudfront.OriginAccessControl;
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

    const customOriginConfig = {
      httpPort: 80,
      httpsPort: 443,
      originProtocolPolicy: "https-only",
      originReadTimeout: 30,
      originSslProtocols: ["TLSv1.2"],
    } satisfies aws.types.input.cloudfront.DistributionOriginCustomOriginConfig;

    this.s3AccessControl = new aws.cloudfront.OriginAccessControl(
      "S3AccessControl",
      {
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
      { ...opts, parent: this },
    );

    const urlCacheBehavior = {
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
      originRequestPolicyId: aws.cloudfront
        .getOriginRequestPolicy(
          { name: "Managed-AllViewerExceptHostHeader" },
          { ...opts, parent: this },
        )
        .then((policy) => {
          if (!policy.id)
            throw new Error("Managed origin request policy not found");

          return policy.id;
        }),
    };

    this.distribution = new aws.cloudfront.Distribution(
      "Distribution",
      {
        enabled: true,
        origins: [
          {
            originId: "/*",
            domainName: `does-not-exist.${resource.AppData.domainName.value}`,
            customOriginConfig,
          },
          {
            originId: "/api/*",
            domainName: new URL(args.routes.api.url).hostname,
            customOriginConfig,
            originPath: `/${resource.AppData.stage}`,
          },
          {
            originId: "/documents/*",
            domainName: new URL(args.routes.documents.url).hostname,
            originAccessControlId: this.s3AccessControl.id,
          },
          {
            originId: "/assets/*",
            domainName: new URL(args.routes.assets.url).hostname,
            originAccessControlId: this.s3AccessControl.id,
          },
        ],
        defaultCacheBehavior: {
          targetOriginId: "/*",
          ...urlCacheBehavior,
        },
        orderedCacheBehaviors: [
          {
            targetOriginId: "/api/*",
            pathPattern: "/api/*",
            ...urlCacheBehavior,
          },
        ],
        restrictions: {
          geoRestriction: {
            restrictionType: "none",
          },
        },
        viewerCertificate: {
          acmCertificateArn: this.certificate.arn,
          sslSupportMethod: "sni-only",
          minimumProtocolVersion: "TLSv1.2_2021",
        },
        waitForDeployment: false,
      },
      { ...opts, parent: this },
    );

    this.registerOutputs({
      cachePolicy: this.cachePolicy.id,
      certificate: this.certificate.id,
      s3AccessControl: this.s3AccessControl.id,
      distribution: this.distribution.id,
    });
  }
}
