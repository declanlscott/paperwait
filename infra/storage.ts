export const assetsBucket = new sst.aws.Bucket("AssetsBucket");

export const assetsDistributionPrivateKey = new tls.PrivateKey(
  "AssetsDistributionPrivateKey",
  { algorithm: "RSA" },
);

export const assetsDistributionPublicKey = new aws.cloudfront.PublicKey(
  "AssetsDistributionPublicKey",
  {
    name: "paperwait-assets-distribution-public-key",
    encodedKey: assetsDistributionPrivateKey.publicKeyPem,
  },
);

export const assetsDistributionKeyPair = {
  private: assetsDistributionPrivateKey,
  public: assetsDistributionPublicKey,
} as const;

export const assetsDistributionKeyGroup = new aws.cloudfront.KeyGroup(
  "AssetsDistributionKeyGroup",
  {
    name: "paperwait-assets-distribution-key-group",
    items: [assetsDistributionKeyPair.public.id],
  },
);

const assetsBucketOriginId = "PaperwaitAssetsBucket";
export const assetsDistribution = new aws.cloudfront.Distribution(
  "AssetsDistribution",
  {
    origins: [
      {
        originId: assetsBucketOriginId,
        domainName: assetsBucket.domain,
      },
    ],
    enabled: true,
    defaultCacheBehavior: {
      allowedMethods: ["GET", "HEAD"],
      cachedMethods: ["GET", "HEAD"],
      targetOriginId: assetsBucketOriginId,
      trustedKeyGroups: [assetsDistributionKeyGroup.id],
      viewerProtocolPolicy: "https-only",
      forwardedValues: {
        queryString: false,
        cookies: {
          forward: "none",
        },
      },
      minTtl: 0,
      defaultTtl: 3600,
      maxTtl: 86400,
      compress: true,
    },
    restrictions: {
      geoRestriction: {
        restrictionType: "none",
      },
    },
    viewerCertificate: {
      cloudfrontDefaultCertificate: true,
    },
  },
);

export const documentsBucket = new sst.aws.Bucket("DocumentsBucket");

export const infraBucket = new sst.aws.Bucket("InfraBucket");

// export const secureXmlRpcForwarderPackage = new aws.s3.BucketObjectv2(
//   "SecureXmlRpcForwarderPackage",
//   {
//     bucket: infraBucket.name,
//     key: "secure-xml-rpc-forwarder.zip",
//     source: "packages/functions/src/secure-xml-rpc-forwarder/dist/index.js",
//   },
// );

export const storage = new sst.Linkable("Storage", {
  properties: {
    assets: {
      bucket: assetsBucket.name,
      distribution: {
        domain: assetsDistribution.domainName,
        publicKey: {
          id: assetsDistributionPublicKey.id,
        },
        privateKey: assetsDistributionPrivateKey.privateKeyPem,
      },
    },
    documents: { bucket: documentsBucket.name },
    infra: { bucket: infraBucket.name },
  },
  include: [
    sst.aws.permission({
      actions: ["s3:*"],
      resources: [assetsBucket.arn, documentsBucket.arn, infraBucket.arn],
    }),
  ],
});
