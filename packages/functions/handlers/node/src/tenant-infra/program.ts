import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "./resource";

import type { Tenant } from "@paperwait/core/tenants/sql";

// TODO: Finish implementing this function

export const getProgram = (tenantId: Tenant["id"]) => async () => {
  const accountName = `${resource.Meta.app.name}-${resource.Meta.app.stage}-tenant-${tenantId}`;
  const emailSegments = resource.Cloud.aws.orgRootEmail.split("@");
  const account = new aws.organizations.Account("Account", {
    name: accountName,
    email: `${emailSegments[0]}+${accountName}@${emailSegments[1]}`,
    parentId: resource.Cloud.aws.tenantsOrganizationalUnitId,
    roleName: "TenantAccountAccessRole",
    iamUserAccessToBilling: "ALLOW",
  });

  const awsOpts = {
    provider: new aws.Provider("AwsProvider", {
      region: resource.Cloud.aws.region as aws.Region,
      assumeRole: {
        roleArn: pulumi.interpolate`arn:aws:iam::${account.id}:role/${account.roleName}`,
      },
    }),
  } satisfies pulumi.CustomResourceOptions;

  const restApi = new aws.apigateway.RestApi(
    "RestApi",
    {
      endpointConfiguration: {
        types: "REGIONAL",
      },
    },
    awsOpts,
  );

  const restApiLogGroup = new aws.cloudwatch.LogGroup(
    "RestApiAccessLog",
    {
      name: pulumi.interpolate`/aws/vendedlogs/apis/${restApi.name}`,
      retentionInDays: 14,
    },
    awsOpts,
  );

  const deployment = new aws.apigateway.Deployment(
    "RestApiDeployment",
    {
      restApi: restApi.id,
      // TODO: triggers?
    },
    awsOpts,
  );

  const stage = new aws.apigateway.Stage(
    "RestApiStage",
    {
      restApi: restApi.id,
      stageName: resource.Meta.app.stage,
      deployment: deployment.id,
      accessLogSettings: {
        destinationArn: restApiLogGroup.arn,
        format: JSON.stringify({
          // request info
          requestTime: `"$context.requestTime"`,
          requestId: `"$context.requestId"`,
          httpMethod: `"$context.httpMethod"`,
          path: `"$context.path"`,
          resourcePath: `"$context.resourcePath"`,
          status: `$context.status`, // integer value, do not wrap in quotes
          responseLatency: `$context.responseLatency`, // integer value, do not wrap in quotes
          xrayTraceId: `"$context.xrayTraceId"`,
          // integration info
          functionResponseStatus: `"$context.integration.status"`,
          integrationRequestId: `"$context.integration.requestId"`,
          integrationLatency: `"$context.integration.latency"`,
          integrationServiceStatus: `"$context.integration.integrationStatus"`,
          // caller info
          ip: `"$context.identity.sourceIp"`,
          userAgent: `"$context.identity.userAgent"`,
          principalId: `"$context.authorizer.principalId"`,
        }),
      },
    },
    awsOpts,
  );

  const papercutResource = new aws.apigateway.Resource(
    "PapercutResource",
    {
      restApi: restApi.id,
      parentId: restApi.rootResourceId,
      pathPart: "papercut",
    },
    awsOpts,
  );

  const secureBridgeResource = new aws.apigateway.Resource(
    "SecureBridgeResource",
    {
      restApi: restApi.id,
      parentId: papercutResource.id,
      pathPart: "secure-bridge",
    },
    awsOpts,
  );

  const papercutSecureBridgeRole = new aws.iam.Role(
    "PapercutSecureBridgeLambdaRole",
    {
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    },
    awsOpts,
  );
  new aws.iam.RolePolicyAttachment(
    "PapercutSecureBridgePolicyAttachment",
    {
      role: papercutSecureBridgeRole,
      policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
    },
    awsOpts,
  );

  const tailscaleLayer = new aws.lambda.LayerVersion("TailscaleLayer", {
    code: new pulumi.asset.FileArchive("/layers/tailscale/layer.zip"),
    layerName: "tailscale",
    compatibleRuntimes: [aws.lambda.Runtime.CustomAL2023],
  });

  const papercutSecureBridgeFunction = new aws.lambda.Function(
    "PapercutSecureBridgeFunction",
    {
      code: new pulumi.asset.FileArchive(
        "/functions/papercut-secure-bridge/function.zip",
      ),
      runtime: aws.lambda.Runtime.CustomAL2023,
      architectures: ["arm64"],
      layers: [tailscaleLayer.arn],
      role: papercutSecureBridgeRole.arn,
    },
    awsOpts,
  );

  new PapercutSecureBridgeRoute(
    "AdjustSharedAccountAccountBalanceRoute",
    {
      restApiId: restApi.id,
      parentId: secureBridgeResource.id,
      pathPart: "adjustSharedAccountAccountBalance",
      requestSchema: {
        sharedAccountName: {
          type: "string",
        },
        adjustment: {
          type: "number",
        },
        comment: {
          type: "string",
        },
      },
      functionArn: papercutSecureBridgeFunction.arn,
    },
    awsOpts,
  );

  new PapercutSecureBridgeRoute(
    "GetSharedAccountPropertiesRoute",
    {
      restApiId: restApi.id,
      parentId: secureBridgeResource.id,
      pathPart: "getSharedAccountProperties",
      requestSchema: {
        sharedAccountName: {
          type: "string",
        },
        properties: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      functionArn: papercutSecureBridgeFunction.arn,
    },
    awsOpts,
  );

  new PapercutSecureBridgeRoute(
    "IsUserExistsRoute",
    {
      restApiId: restApi.id,
      parentId: secureBridgeResource.id,
      pathPart: "isUserExists",
      requestSchema: {
        username: {
          type: "string",
        },
      },
      functionArn: papercutSecureBridgeFunction.arn,
    },
    awsOpts,
  );

  new PapercutSecureBridgeRoute(
    "ListSharedAccountsRoute",
    {
      restApiId: restApi.id,
      parentId: secureBridgeResource.id,
      pathPart: "listSharedAccounts",
      requestSchema: {
        offset: {
          type: "integer",
        },
        limit: {
          type: "integer",
        },
      },
      functionArn: papercutSecureBridgeFunction.arn,
    },
    awsOpts,
  );

  new PapercutSecureBridgeRoute(
    "ListUserSharedAccountsRoute",
    {
      restApiId: restApi.id,
      parentId: secureBridgeResource.id,
      pathPart: "listUserSharedAccounts",
      requestSchema: {
        username: {
          type: "string",
        },
        offset: {
          type: "integer",
        },
        limit: {
          type: "integer",
        },
        ignoreUserAccountSelectionConfig: {
          type: "boolean",
        },
      },
      functionArn: papercutSecureBridgeFunction.arn,
    },
    awsOpts,
  );
};

interface PapercutSecureBridgeRouteArgs {
  restApiId: aws.apigateway.RestApi["id"];
  parentId: aws.apigateway.Resource["id"];
  pathPart: pulumi.Input<string>;
  requestSchema: pulumi.Input<Record<string, unknown>>;
  functionArn: aws.lambda.Function["arn"];
}

class PapercutSecureBridgeRoute extends pulumi.ComponentResource {
  private resource: aws.apigateway.Resource;
  private requestValidator: aws.apigateway.RequestValidator;
  private requestModel: aws.apigateway.Model;
  private method: aws.apigateway.Method;
  private integration: aws.apigateway.Integration;

  constructor(
    name: string,
    args: PapercutSecureBridgeRouteArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    super(
      `${resource.Meta.app.name}:aws:PapercutSecureBridgeRoute`,
      name,
      args,
      opts,
    );

    this.resource = new aws.apigateway.Resource(
      `${name}Resource`,
      {
        restApi: args.restApiId,
        parentId: args.parentId,
        pathPart: args.pathPart,
      },
      { ...opts, parent: this },
    );

    this.requestValidator = new aws.apigateway.RequestValidator(
      `${name}RequestValidator`,
      {
        restApi: args.restApiId,
        validateRequestBody: true,
        validateRequestParameters: false,
      },
      { ...opts, parent: this },
    );

    this.requestModel = new aws.apigateway.Model(
      `${name}RequestModel`,
      {
        restApi: args.restApiId,
        contentType: "application/json",
        schema: pulumi.jsonStringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: `${name}RequestModel`,
          type: "object",
          properties: args.requestSchema,
        }),
      },
      { ...opts, parent: this },
    );

    this.method = new aws.apigateway.Method(
      `${name}Method`,
      {
        restApi: args.restApiId,
        resourceId: this.resource.id,
        httpMethod: "POST",
        authorization: "AWS_IAM",
        requestValidatorId: this.requestValidator.id,
        requestModels: {
          "application/json": this.requestModel.id,
        },
      },
      { ...opts, parent: this },
    );

    this.integration = new aws.apigateway.Integration(
      `${name}Integration`,
      {
        restApi: args.restApiId,
        resourceId: this.resource.id,
        httpMethod: this.method.httpMethod,
        integrationHttpMethod: "POST",
        type: "AWS_PROXY",
        uri: args.functionArn,
      },
      { ...opts, parent: this },
    );
  }

  public get nodes() {
    return {
      resource: this.resource,
      requestValidator: this.requestValidator,
      requestModel: this.requestModel,
      method: this.method,
      integration: this.integration,
    };
  }
}
