import {
  organization,
  organizationRoot,
  tenantsOrganizationalUnit,
} from "./organization";

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
              "aws:PrincipalOrgPaths": [
                $interpolate`${organization.id}/${organizationRoot.id}/${tenantsOrganizationalUnit.id}/`,
              ],
            },
          },
        });
      });
    },
  },
});

export const pulumiBucket = new sst.aws.Bucket("PulumiBucket");

export const infraDeadLetterQueue = new sst.aws.Queue("InfraDeadLetterQueue");

export const tenantInfraQueue = new sst.aws.Queue("TenantInfraQueue", {
  dlq: infraDeadLetterQueue.arn,
  visibilityTimeout: "5 minutes",
});
