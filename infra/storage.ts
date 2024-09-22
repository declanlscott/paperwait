export const pulumiBackendBucket = new sst.aws.Bucket("PulumiBackendBucket");

export const newAccountQueue = new sst.aws.Queue("NewAccountQueue");

export const storage = new sst.Linkable("Storage", {
  properties: {
    pulumiBackend: {
      bucket: pulumiBackendBucket.name,
    },
    newAccountQueue: newAccountQueue.url,
  },
  include: [
    sst.aws.permission({
      actions: ["s3:*"],
      resources: [pulumiBackendBucket.arn],
    }),
    sst.aws.permission({
      actions: ["sqs:*"],
      resources: [newAccountQueue.arn],
    }),
  ],
});
