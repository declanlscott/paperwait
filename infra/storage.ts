export const codeBucket = new sst.aws.Bucket("CodeBucket", {
  access: "public",
  versioning: true,
});

export const pulumiBackendBucket = new sst.aws.Bucket("PulumiBackendBucket");

export const tenantInfraDlq = new sst.aws.Queue("TenantInfraDlq");

export const tenantInfraTimeout = "5 minutes";

export const tenantInfraQueue = new sst.aws.Queue("TenantInfraQueue", {
  dlq: tenantInfraDlq.arn,
  visibilityTimeout: tenantInfraTimeout,
});
