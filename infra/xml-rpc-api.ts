import { AWS_REGION } from "@paperwait/core/constants";

export const xmlRpcApi = new sst.aws.Function("XmlRpcApi", {
  handler: "packages/functions/src/xml-rpc-api.handler",
  timeout: "10 seconds",
  permissions: [
    {
      actions: ["ssm:GetParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${AWS_REGION}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/papercut`,
      ],
    },
  ],
});
