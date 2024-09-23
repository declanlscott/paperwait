import { db } from "./db";
import { meta } from "./meta";
import { realtime } from "./realtime";

export const pulumiBackendBucket = new sst.aws.Bucket("PulumiBackendBucket");

export const createAwsAccountDlq = new sst.aws.Queue("CreateAwsAccountDlq");
const createAwsAccountTimeout = "5 minutes";
export const createAwsAccountQueue = new sst.aws.Queue(
  "CreateAwsAccountQueue",
  {
    dlq: createAwsAccountDlq.arn,
    visibilityTimeout: createAwsAccountTimeout,
  },
);
createAwsAccountQueue.subscribe({
  handler: "packages/functions/ts/src/create-aws-account.handler",
  timeout: createAwsAccountTimeout,
  architecture: "arm64",
  link: [db, meta, pulumiBackendBucket, realtime],
});

export const storage = new sst.Linkable("Storage", {
  properties: {
    pulumiBackend: {
      bucket: pulumiBackendBucket.name,
    },
    createAwsAccountQueue: createAwsAccountQueue.url,
  },
  include: [
    sst.aws.permission({
      actions: ["s3:*"],
      resources: [pulumiBackendBucket.arn],
    }),
    sst.aws.permission({
      actions: ["sqs:*"],
      resources: [createAwsAccountQueue.arn],
    }),
  ],
});
