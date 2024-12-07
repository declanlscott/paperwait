export const tenantInfraDeadLetterQueue = new sst.aws.Queue(
  "TenantInfraDeadLetterQueue",
  {
    transform: {
      queue: {
        messageRetentionSeconds: 1209600, // 14 days
      },
    },
  },
  { retainOnDelete: $app.stage === "production" },
);

export const tenantInfraQueue = new sst.aws.Queue(
  "TenantInfraQueue",
  {
    dlq: tenantInfraDeadLetterQueue.arn,
    visibilityTimeout: "15 minutes",
  },
  { retainOnDelete: $app.stage === "production" },
);

export const invoicesProcessorDeadLetterQueue = new sst.aws.Queue(
  "InvoicesProcessorDeadLetterQueue",
  {
    transform: {
      queue: {
        messageRetentionSeconds: 1209600, // 14 days
      },
    },
  },
  { retainOnDelete: $app.stage === "production" },
);
