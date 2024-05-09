import { natSecurityGroup, privateSubnetsOutput } from "./vpc";

export const papercutApiGateway = new sst.aws.ApiGatewayV2(
  "PapercutApiGateway",
  {
    transform: {
      route: {
        args: (props) => {
          props.auth = { iam: true };
        },
      },
    },
  },
);

const getPapercutParameterPermission = {
  actions: ["ssm:GetParameter"],
  resources: [
    $interpolate`arn:aws:ssm:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/papercut`,
  ],
} satisfies sst.aws.FunctionPermissionArgs;

papercutApiGateway.route("POST /is-user-exists", {
  handler: "packages/functions/src/is-user-exists.handler",
  timeout: "10 seconds",
  permissions: [getPapercutParameterPermission],
  vpc: {
    securityGroups: [natSecurityGroup.id],
    subnets: privateSubnetsOutput.apply((subnets) =>
      subnets.map((subnet) => subnet.id),
    ),
  },
});

papercutApiGateway.route("POST /list-user-shared-accounts", {
  handler: "packages/functions/src/list-user-shared-accounts.handler",
  timeout: "10 seconds",
  permissions: [getPapercutParameterPermission],
  vpc: {
    securityGroups: [natSecurityGroup.id],
    subnets: privateSubnetsOutput.apply((subnets) =>
      subnets.map((subnet) => subnet.id),
    ),
  },
});

export const adjustSharedAccountAccountBalanceDeadLetterQueue =
  new sst.aws.Queue("AdjustSharedAccountAccountBalanceDeadLetterQueue");

const sevenDaysInSeconds = 60 * 60 * 24 * 7;
export const adjustSharedAccountAccountBalanceQueue = new sst.aws.Queue(
  "AdjustSharedAccountAccountBalanceQueue",
  {
    transform: {
      queue: (q) => {
        q.messageRetentionSeconds = sevenDaysInSeconds;
        q.redrivePolicy = $jsonStringify({
          deadLetterTargetArn:
            adjustSharedAccountAccountBalanceDeadLetterQueue.arn,
          maxReceiveCount: 3,
        });
      },
    },
  },
);

export const papercutApiRole = new aws.iam.Role("PapercutApiRole", {
  assumeRolePolicy: $jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "apigateway.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  }),

  inlinePolicies: [
    {
      name: "QueueSendMessage",
      policy: adjustSharedAccountAccountBalanceQueue.arn.apply((arn) =>
        aws.iam.getPolicyDocument({
          statements: [
            {
              effect: "Allow",
              actions: ["sqs:SendMessage"],
              resources: [arn],
            },
          ],
        }),
      ).json,
    },
  ],
});

export const adjustSharedAccountAccountBalanceIntegration =
  new aws.apigatewayv2.Integration(
    "AdjustSharedAccountAccountBalanceIntegration",
    {
      apiId: papercutApiGateway.nodes.api.id,
      integrationType: "AWS_PROXY",
      integrationSubtype: "SQS-SendMessage",
      credentialsArn: papercutApiRole.arn,
      requestParameters: {
        QueueUrl: adjustSharedAccountAccountBalanceQueue.url,
        MessageBody: "$request.body.message",
      },
    },
  );

export const adjustSharedAccountAccountBalanceRoute =
  new aws.apigatewayv2.Route("AdjustSharedAccountAccountBalanceRoute", {
    apiId: papercutApiGateway.nodes.api.id,
    routeKey: "POST /adjust-shared-account-account-balance",
    authorizationType: "AWS_IAM",
    target: $interpolate`integrations/${adjustSharedAccountAccountBalanceIntegration.id}`,
  });

adjustSharedAccountAccountBalanceQueue.subscribe({
  handler:
    "packages/functions/src/adjust-shared-account-account-balance.handler",
  timeout: "10 seconds",
  permissions: [getPapercutParameterPermission],
  vpc: {
    securityGroups: [natSecurityGroup.id],
    subnets: privateSubnetsOutput.apply((subnets) =>
      subnets.map((subnet) => subnet.id),
    ),
  },
  link: [adjustSharedAccountAccountBalanceQueue],
});
