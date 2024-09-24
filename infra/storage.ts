export const pulumiBackendBucket = new sst.aws.Bucket("PulumiBackendBucket");

export const tenantInfraDlq = new sst.aws.Queue("TenantInfraDlq");

export const tenantInfraTimeout = "5 minutes";

export const tenantInfraQueue = new sst.aws.Queue("TenantInfraQueue", {
  dlq: tenantInfraDlq.arn,
  visibilityTimeout: tenantInfraTimeout,
});

export const storage = new sst.Linkable("Storage", {
  properties: {
    pulumiBackend: {
      bucket: pulumiBackendBucket.name,
    },
    tenantInfraQueue: tenantInfraQueue.url,
  },
  include: [
    sst.aws.permission({
      actions: ["s3:*"],
      resources: [pulumiBackendBucket.arn],
    }),
    sst.aws.permission({
      actions: ["sqs:*"],
      resources: [tenantInfraQueue.arn],
    }),
  ],
});
