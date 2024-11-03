import { tenantsPrincipalOrgPath } from "./organization";

export const codeBucket = new sst.aws.Bucket("CodeBucket", {
  versioning: true,
  transform: {
    policy: (args) => {
      args.policy = sst.aws.iamEdit(args.policy, (policy) => {
        policy.Statement.push({
          Effect: "Allow",
          Action: ["s3:GetObject"],
          Resource: $interpolate`arn:aws:s3:::${args.bucket}/*`,
          Principal: "*",
          Condition: {
            "ForAnyValue:StringEquals": {
              "aws:PrincipalOrgPaths": [tenantsPrincipalOrgPath],
            },
          },
        });
      });
    },
  },
});

export const pulumiBucket = new sst.aws.Bucket("PulumiBucket");

export const infraDeadLetterQueue = new sst.aws.Queue("InfraDeadLetterQueue", {
  transform: {
    queue: {
      messageRetentionSeconds: 1209600, // 14 days
    },
  },
});

export const tenantInfraQueue = new sst.aws.Queue("TenantInfraQueue", {
  dlq: infraDeadLetterQueue.arn,
  visibilityTimeout: "15 minutes",
});

export const invoicesProcessorDeadLetterQueue = new sst.aws.Queue(
  "InvoicesProcessorDeadLetterQueue",
  {
    transform: {
      queue: {
        messageRetentionSeconds: 1209600, // 14 days
      },
    },
  },
);
