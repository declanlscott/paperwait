export const infraBucket = new sst.aws.Bucket("InfraBucket");

export const tenantInfraDlq = new sst.aws.Queue("TenantInfraDlq");

export const tenantInfraTimeout = "5 minutes";

export const tenantInfraQueue = new sst.aws.Queue("TenantInfraQueue", {
  dlq: tenantInfraDlq.arn,
  visibilityTimeout: tenantInfraTimeout,
});

export const storage = new sst.Linkable("Storage", {
  properties: {
    infra: {
      bucket: infraBucket.name,
    },
    tenantInfraQueue: tenantInfraQueue.url,
  },
  include: [
    sst.aws.permission({
      actions: ["s3:*"],
      resources: [infraBucket.arn],
    }),
    sst.aws.permission({
      actions: ["sqs:*"],
      resources: [tenantInfraQueue.arn],
    }),
  ],
});
