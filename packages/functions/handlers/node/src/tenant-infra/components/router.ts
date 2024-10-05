import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "../resource";

export interface RouterArgs {
  tenantId: string;
  routes: Record<"api" | "assets" | "documents", { url: pulumi.Input<string> }>;
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
    super(`${resource.AppData.name}:tenant:aws:Router`, "Router", args, opts);

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
      { parent: this },
    );

    const usEast1Provider = new aws.Provider(
      "UsEast1Provider",
      { region: "us-east-1" },
      { parent: this },
    );

    this.certificate = new aws.acm.Certificate(
      "Certificate",
      {
        domainName: `${args.tenantId}.${resource.AppData.domainName.fullyQualified}`,
        validationMethod: "DNS",
      },
      {
        provider: usEast1Provider,
        parent: this,
      },
    );

    this.certificate.domainValidationOptions.apply((options) =>
      options.forEach(
        (option, index) =>
          new cloudflare.Record(
            `CertificateValidationRecord${index}`,
            {
              zoneId: cloudflare.getZoneOutput({
                name: resource.AppData.domainName.value,
              }).id,
              type: option.resourceRecordType,
              name: option.resourceRecordName,
              content: option.resourceRecordValue,
            },
            { parent: this },
          ),
      ),
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
      cachePolicyId: this.cachePolicy.id,
      originRequestPolicyId: aws.cloudfront
        .getOriginRequestPolicy(
          { name: "Managed-AllViewerExceptHostHeader" },
          { parent: this },
        )
        .then((policy) => {
          if (!policy.id)
            throw new Error(
              "Managed-AllViewerExceptHostHeader origin request policy not found",
            );

          return policy.id;
        }),
    };

    const bucketCacheBehaviorConfig = {
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      cachePolicyId: aws.cloudfront
        .getOriginRequestPolicy(
          { name: "Managed-CachingOptimized" },
          { parent: this },
        )
        .then((policy) => {
          if (!policy.id)
            throw new Error("Managed-CachingOptimized cache policy not found");

          return policy.id;
        }),
    };

    this.distribution = new aws.cloudfront.Distribution(
      "Distribution",
      {
        enabled: true,
        origins: [
          {
            originId: "/api/*",
            domainName: new URL(args.routes.api.url).hostname,
            customOriginConfig,
            originPath: `/${resource.AppData.stage}`,
          },
          {
            originId: "/assets/*",
            domainName: new URL(args.routes.assets.url).hostname,
            originAccessControlId: this.s3AccessControl.id,
          },
          {
            originId: "/documents/*",
            domainName: new URL(args.routes.documents.url).hostname,
            originAccessControlId: this.s3AccessControl.id,
          },
          {
            originId: "/*",
            domainName: `does-not-exist.${resource.AppData.domainName.value}`,
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
          acmCertificateArn: this.certificate.arn,
          sslSupportMethod: "sni-only",
          minimumProtocolVersion: "TLSv1.2_2021",
        },
        waitForDeployment: false,
      },
      { parent: this },
    );

    this.registerOutputs({
      cachePolicy: this.cachePolicy.id,
      certificate: this.certificate.id,
      s3AccessControl: this.s3AccessControl.id,
      distribution: this.distribution.id,
    });
  }

  public get url() {
    return pulumi.interpolate`https://${this.certificate.domainName}`;
  }
}
