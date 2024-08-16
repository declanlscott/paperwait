import { isDev } from "./misc";
import { natSecurityGroup, privateSubnetsOutput, whitelist } from "./vpc";

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

papercutApiGateway.route("POST /get-shared-account-properties", {
  handler: "packages/functions/src/get-shared-account-properties.handler",
  timeout: "10 seconds",
  permissions: [getPapercutParameterPermission],
  vpc: {
    securityGroups: [natSecurityGroup.id],
    privateSubnets: privateSubnetsOutput.apply((subnets) =>
      subnets.map((subnet) => subnet.id),
    ),
  },
});

papercutApiGateway.route("POST /is-user-exists", {
  handler: "packages/functions/src/is-user-exists.handler",
  timeout: "10 seconds",
  permissions: [getPapercutParameterPermission],
  vpc: {
    securityGroups: [natSecurityGroup.id],
    privateSubnets: privateSubnetsOutput.apply((subnets) =>
      subnets.map((subnet) => subnet.id),
    ),
  },
});

papercutApiGateway.route("POST /list-shared-accounts", {
  handler: "packages/functions/src/list-shared-accounts.handler",
  timeout: "10 seconds",
  permissions: [getPapercutParameterPermission],
  vpc: {
    securityGroups: [natSecurityGroup.id],
    privateSubnets: privateSubnetsOutput.apply((subnets) =>
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
    privateSubnets: privateSubnetsOutput.apply((subnets) =>
      subnets.map((subnet) => subnet.id),
    ),
  },
});

papercutApiGateway.route("POST /health-check", {
  handler: "packages/functions/src/health-check.handler",
  timeout: "10 seconds",
  permissions: [getPapercutParameterPermission],
  vpc: {
    securityGroups: [natSecurityGroup.id],
    privateSubnets: privateSubnetsOutput.apply((subnets) =>
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

export const adjustSharedAccountAccountBalanceIntegrationCredentials =
  new aws.iam.Role("AdjustSharedAccountAccountBalanceIntegrationCredentials", {
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
        name: "AdjustSharedAccountAccountBalanceQueueSendMessagePolicy",
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
      credentialsArn:
        adjustSharedAccountAccountBalanceIntegrationCredentials.arn,
      requestParameters: {
        QueueUrl: adjustSharedAccountAccountBalanceQueue.url,
        MessageBody: "$request.body.MessageBody",
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
    privateSubnets: privateSubnetsOutput.apply((subnets) =>
      subnets.map((subnet) => subnet.id),
    ),
  },
  link: [adjustSharedAccountAccountBalanceQueue],
});

export const mockPapercutApi = new sst.cloudflare.Worker("MockPapercutApi", {
  handler: "packages/functions/src/mock-papercut-api.ts",
  url: true,
  environment: {
    AUTH_TOKEN: "auth-token",
  },
  link: [whitelist, isDev],
});
