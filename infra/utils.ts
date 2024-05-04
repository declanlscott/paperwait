import { AWS_REGION } from "@paperwait/core/constants";

const awsAccountId = aws.getCallerIdentityOutput().accountId;

export const permission = {
  papercutParameter: {
    actions: ["ssm:GetParameter", "ssm:PutParameter"],
    resources: [
      $resolve([awsAccountId]).apply(
        ([accountId]) =>
          `arn:aws:ssm:${AWS_REGION}:${accountId}:parameter/paperwait/org/*/papercut`,
      ),
    ],
  },
};
