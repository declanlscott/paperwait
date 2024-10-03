import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "./resource";

import type { Tenant } from "@paperwait/core/tenants/sql";

// TODO: Finish implementing this function

export const getProgram = (tenantId: Tenant["id"]) => async () => {
  const accountName = `${resource.AppData.name}-${resource.AppData.stage}-tenant-${tenantId}`;
  const emailSegments = resource.Cloud.aws.orgRootEmail.split("@");
  const account = new aws.organizations.Account("Account", {
    name: accountName,
    email: `${emailSegments[0]}+${accountName}@${emailSegments[1]}`,
    parentId: resource.Cloud.aws.tenantsOrganizationalUnitId,
    roleName: "TenantAccountAccessRole",
    iamUserAccessToBilling: "ALLOW",
  });

  const accountProvider = new aws.Provider("AccountProvider", {
    region: resource.Cloud.aws.region as aws.Region,
    assumeRole: {
      roleArn: pulumi.interpolate`arn:aws:iam::${account.id}:role/${account.roleName}`,
    },
  });

  const restApi = new aws.apigateway.RestApi(
    "RestApi",
    {
      endpointConfiguration: {
        types: "REGIONAL",
      },
    },
    { provider: accountProvider },
  );

  const restApiPolicy = new aws.apigateway.RestApiPolicy(
    "RestApiPolicy",
    {
      restApiId: restApi.id,
      policy: aws.iam.getPolicyDocumentOutput({
        statements: [
          {
            effect: "Allow",
            principals: [
              {
                type: "AWS",
                identifiers: [resource.WebOutputs.server.roleArn],
              },
            ],
            actions: ["execute-api:Invoke"],
            resources: [restApi.executionArn],
          },
        ],
      }).json,
    },
    { provider: accountProvider },
  );

  const papercutResource = new aws.apigateway.Resource(
    "PapercutResource",
    {
      restApi: restApi.id,
      parentId: restApi.rootResourceId,
      pathPart: "papercut",
    },
    { provider: accountProvider },
  );

  const secureBridgeResource = new aws.apigateway.Resource(
    "SecureBridgeResource",
    {
      restApi: restApi.id,
      parentId: papercutResource.id,
      pathPart: "secure-bridge",
    },
    { provider: accountProvider },
  );

  const papercutSecureBridgeLambdaRole = new aws.iam.Role(
    "PapercutSecureBridgeLambdaRole",
    {
      assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
        statements: [
          {
            effect: "Allow",
            principals: [
              {
                type: "Service",
                identifiers: ["lambda.amazonaws.com"],
              },
            ],
            actions: ["sts:AssumeRole"],
          },
        ],
      }).json,
    },
    { provider: accountProvider },
  );
  new aws.iam.RolePolicyAttachment(
    "PapercutSecureBridgePolicyAttachment",
    {
      role: papercutSecureBridgeLambdaRole,
      policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
    },
    { provider: accountProvider },
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
      role: papercutSecureBridgeLambdaRole.arn,
    },
    { provider: accountProvider },
  );

  const adjustSharedAccountAccountBalanceRoute = new PapercutSecureBridgeRoute(
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
    { providers: { aws: accountProvider } },
  );

  const getSharedAccountPropertiesRoute = new PapercutSecureBridgeRoute(
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
    { providers: { aws: accountProvider } },
  );

  const isUserExistsRoute = new PapercutSecureBridgeRoute(
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
    { providers: { aws: accountProvider } },
  );

  const listSharedAccountsRoute = new PapercutSecureBridgeRoute(
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
    { providers: { aws: accountProvider } },
  );

  const listUserSharedAccountsRoute = new PapercutSecureBridgeRoute(
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
    { providers: { aws: accountProvider } },
  );

  const restApiLogGroup = new aws.cloudwatch.LogGroup(
    "RestApiAccessLog",
    {
      name: pulumi.interpolate`/aws/vendedlogs/apis/${restApi.name}`,
      retentionInDays: 14,
    },
    { provider: accountProvider },
  );

  const restApiDeployment = new aws.apigateway.Deployment(
    "RestApiDeployment",
    {
      restApi: restApi.id,
      // TODO: Better triggers based on above resources
      triggers: {
        deployedAt: new Date().toISOString(),
      },
    },
    { provider: accountProvider },
  );

  const restApiStage = new aws.apigateway.Stage(
    "RestApiStage",
    {
      restApi: restApi.id,
      stageName: resource.AppData.stage,
      deployment: restApiDeployment.id,
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
    { provider: accountProvider },
  );

  const restApiCertificate = new aws.acm.Certificate(
    "RestApiCertificate",
    {
      domainName: `${tenantId}.${resource.AppData.domainName.fullyQualified}`,
      validationMethod: "DNS",
    },
    { provider: accountProvider },
  );

  const restApiDomainName = new aws.apigateway.DomainName(
    "RestApiDomainName",
    {
      domainName: restApiCertificate.domainName,
      regionalCertificateArn: restApiCertificate.arn,
    },
    { provider: accountProvider },
  );

  restApiCertificate.domainValidationOptions.apply((options) =>
    options.map(
      (option, index) =>
        new cloudflare.Record(`RestApiCertificateValidationRecord${index}`, {
          zoneId: cloudflare
            .getZone({ name: resource.AppData.domainName.value })
            .then((zone) => zone.id),
          name: option.resourceRecordName,
          content: option.resourceRecordValue,
          type: option.resourceRecordType,
        }),
    ),
  );

  new aws.apigateway.BasePathMapping(
    "RestApiDomainMapping",
    {
      restApi: restApi.id,
      domainName: restApiDomainName.id,
      stageName: restApiStage.stageName,
    },
    { provider: accountProvider },
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
      `${resource.AppData.name}:aws:PapercutSecureBridgeRoute`,
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

    this.registerOutputs({
      resource: this.resource.id,
      requestValidator: this.requestValidator.id,
      requestModel: this.requestModel.id,
      method: this.method.id,
      integration: this.integration.id,
    });
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
