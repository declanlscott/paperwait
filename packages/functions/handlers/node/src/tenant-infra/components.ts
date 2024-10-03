import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "./resource";

import type { Tenant } from "@paperwait/core/tenants/sql";

export interface TenantAccountArgs {
  tenantId: Tenant["id"];
}

export class TenantAccount extends pulumi.ComponentResource {
  private static instance: TenantAccount;

  private account: aws.organizations.Account;
  private provider: aws.Provider;

  public static getInstance(
    args: TenantAccountArgs,
    opts?: pulumi.ComponentResourceOptions,
  ): TenantAccount {
    if (!this.instance) this.instance = new TenantAccount(args, opts);

    return this.instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof TenantAccount.getInstance>
  ) {
    super(
      `${resource.AppData.name}:aws:TenantAccount`,
      "TenantAccount",
      args,
      opts,
    );

    const tenantAccountName = `${resource.AppData.name}-${resource.AppData.stage}-tenant-${args.tenantId}`;

    const emailSegments = resource.Cloud.aws.orgRootEmail.split("@");

    this.account = new aws.organizations.Account(
      "Account",
      {
        name: tenantAccountName,
        email: `${emailSegments[0]}+${tenantAccountName}@${emailSegments[1]}`,
        parentId: resource.Cloud.aws.tenantsOrganizationalUnitId,
        roleName: "OrganizationAccountAccessRole",
        iamUserAccessToBilling: "ALLOW",
      },
      { ...opts, parent: this },
    );

    this.provider = new aws.Provider(
      "Provider",
      {
        region: resource.Cloud.aws.region as aws.Region,
        assumeRole: {
          roleArn: pulumi.interpolate`arn:aws:iam::${this.account.id}:role/${this.account.roleName}`,
        },
      },
      { ...opts, parent: this },
    );

    this.registerOutputs({
      account: this.account.id,
      provider: this.provider.id,
    });
  }

  public get nodes() {
    return {
      account: this.account,
      provider: this.provider,
    };
  }
}

export interface PapercutSecureBridgeArgs {
  tenantAccountId: aws.organizations.Account["id"];
}

export class PapercutSecureBridge extends pulumi.ComponentResource {
  private static instance: PapercutSecureBridge;

  private role: aws.iam.Role;
  private tailscaleLayer: aws.lambda.LayerVersion;
  private function: aws.lambda.Function;

  public static getInstance(
    args: PapercutSecureBridgeArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    if (!this.instance) this.instance = new PapercutSecureBridge(args, opts);

    return this.instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof PapercutSecureBridge.getInstance>
  ) {
    super(
      `${resource.AppData.name}:aws:PapercutSecureBridgeFunction`,
      "PapercutSecureBridgeFunction",
      args,
      opts,
    );

    this.role = new aws.iam.Role(
      "Role",
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
      { ...opts, parent: this },
    );

    new aws.iam.RolePolicyAttachment(
      "BasicExecutionPolicyAttachment",
      {
        role: this.role,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      },
      { ...opts, parent: this },
    );

    new aws.iam.RolePolicy("InlinePolicy", {
      role: this.role,
      policy: aws.iam.getPolicyDocumentOutput({
        statements: [
          {
            effect: "Allow",
            actions: ["ssm:GetParameter"],
            resources: [
              "paperwait/tailscale/auth-key",
              "paperwait/papercut/web-services/credentials",
            ].map(
              (name) =>
                pulumi.interpolate`arn:aws:ssm:${resource.Cloud.aws.region}:${args.tenantAccountId}:parameter/${name}`,
            ),
          },
        ],
      }).json,
    });

    this.tailscaleLayer = new aws.lambda.LayerVersion(
      "TailscaleLayer",
      {
        code: new pulumi.asset.FileArchive("/layers/tailscale/layer.zip"),
        layerName: "tailscale",
        compatibleRuntimes: [aws.lambda.Runtime.CustomAL2023],
      },
      { ...opts, parent: this },
    );

    this.function = new aws.lambda.Function(
      "Function",
      {
        code: new pulumi.asset.FileArchive(
          "/functions/papercut-secure-bridge/function.zip",
        ),
        runtime: aws.lambda.Runtime.CustomAL2023,
        architectures: ["arm64"],
        layers: [this.tailscaleLayer.arn],
        role: this.role.arn,
      },
      { ...opts, parent: this },
    );

    this.registerOutputs({
      role: this.role.id,
      tailscaleLayer: this.tailscaleLayer.id,
      function: this.function.id,
    });
  }

  public get nodes() {
    return {
      role: this.role,
      tailscaleLayer: this.tailscaleLayer,
      function: this.function,
    };
  }
}

export interface TenantApiArgs extends TenantAccountArgs {
  papercutSecureBridgeFunctionArn: aws.lambda.Function["arn"];
}

export class TenantApi extends pulumi.ComponentResource {
  private static instance: TenantApi;

  private api: aws.apigateway.RestApi;
  private policy: aws.apigateway.RestApiPolicy;
  private papercutResource: aws.apigateway.Resource;
  private secureBridgeResource: aws.apigateway.Resource;
  private papercutSecureBridgeRoutes: Array<PapercutSecureBridgeRoute> = [];
  private logGroup: aws.cloudwatch.LogGroup;
  private deployment: aws.apigateway.Deployment;
  private stage: aws.apigateway.Stage;
  private certificate: aws.acm.Certificate;
  private domainName: aws.apigateway.DomainName;
  private basePathMapping: aws.apigateway.BasePathMapping;

  public static getInstance(
    args: TenantApiArgs,
    opts: pulumi.ComponentResourceOptions,
  ): TenantApi {
    if (!this.instance) this.instance = new TenantApi(args, opts);

    return this.instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof TenantApi.getInstance>
  ) {
    super(`${resource.AppData.name}:aws:TenantApi`, "TenantApi", args, opts);

    this.api = new aws.apigateway.RestApi(
      "Api",
      {
        endpointConfiguration: {
          types: "REGIONAL",
        },
      },
      { ...opts, parent: this },
    );

    this.policy = new aws.apigateway.RestApiPolicy(
      "Policy",
      {
        restApiId: this.api.id,
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
              resources: [this.api.executionArn],
            },
          ],
        }).json,
      },
      { ...opts, parent: this },
    );

    this.papercutResource = new aws.apigateway.Resource(
      "PapercutResource",
      {
        restApi: this.api.id,
        parentId: this.api.rootResourceId,
        pathPart: "papercut",
      },
      { ...opts, parent: this },
    );

    this.secureBridgeResource = new aws.apigateway.Resource(
      "SecureBridgeResource",
      {
        restApi: this.api.id,
        parentId: this.papercutResource.id,
        pathPart: "secure-bridge",
      },
      { ...opts, parent: this },
    );

    this.papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "AdjustSharedAccountAccountBalanceRoute",
        {
          restApiId: this.api.id,
          parentId: this.secureBridgeResource.id,
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
          functionArn: args.papercutSecureBridgeFunctionArn,
        },
        { ...opts, parent: this },
      ),
    );

    this.papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "GetSharedAccountPropertiesRoute",
        {
          restApiId: this.api.id,
          parentId: this.secureBridgeResource.id,
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
          functionArn: args.papercutSecureBridgeFunctionArn,
        },
        { ...opts, parent: this },
      ),
    );

    this.papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "IsUserExistsRoute",
        {
          restApiId: this.api.id,
          parentId: this.secureBridgeResource.id,
          pathPart: "isUserExists",
          requestSchema: {
            username: {
              type: "string",
            },
          },
          functionArn: args.papercutSecureBridgeFunctionArn,
        },
        { ...opts, parent: this },
      ),
    );

    this.papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "ListSharedAccountsRoute",
        {
          restApiId: this.api.id,
          parentId: this.secureBridgeResource.id,
          pathPart: "listSharedAccounts",
          requestSchema: {
            offset: {
              type: "integer",
            },
            limit: {
              type: "integer",
            },
          },
          functionArn: args.papercutSecureBridgeFunctionArn,
        },
        { ...opts, parent: this },
      ),
    );

    this.papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "ListUserSharedAccountsRoute",
        {
          restApiId: this.api.id,
          parentId: this.secureBridgeResource.id,
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
          functionArn: args.papercutSecureBridgeFunctionArn,
        },
        { ...opts, parent: this },
      ),
    );

    this.logGroup = new aws.cloudwatch.LogGroup(
      "LogGroup",
      {
        name: pulumi.interpolate`/aws/vendedlogs/apis/${this.api.name}`,
        retentionInDays: 14,
      },
      { ...opts, parent: this },
    );

    this.deployment = new aws.apigateway.Deployment(
      "Deployment",
      {
        restApi: this.api.id,
        // TODO: Better triggers based on above resources
        triggers: {
          deployedAt: new Date().toISOString(),
        },
      },
      { ...opts, parent: this },
    );

    this.stage = new aws.apigateway.Stage(
      "Stage",
      {
        restApi: this.api.id,
        stageName: resource.AppData.stage,
        deployment: this.deployment.id,
        accessLogSettings: {
          destinationArn: this.logGroup.arn,
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
      { ...opts, parent: this },
    );

    this.certificate = new aws.acm.Certificate(
      "Certificate",
      {
        domainName: `${args.tenantId}.${resource.AppData.domainName.fullyQualified}`,
        validationMethod: "DNS",
      },
      { ...opts, parent: this },
    );

    this.domainName = new aws.apigateway.DomainName(
      "DomainName",
      {
        domainName: this.certificate.domainName,
        regionalCertificateArn: this.certificate.arn,
      },
      { ...opts, parent: this },
    );

    this.certificate.domainValidationOptions.apply((options) =>
      options.map(
        (option, index) =>
          new cloudflare.Record(
            `CertificateValidationRecord${index}`,
            {
              zoneId: cloudflare
                .getZone({ name: resource.AppData.domainName.value })
                .then((zone) => zone.id),
              name: option.resourceRecordName,
              content: option.resourceRecordValue,
              type: option.resourceRecordType,
            },
            { ...opts, parent: this },
          ),
      ),
    );

    this.basePathMapping = new aws.apigateway.BasePathMapping(
      "BasePathMapping",
      {
        restApi: this.api.id,
        domainName: this.domainName.id,
        stageName: this.stage.stageName,
      },
      { ...opts, parent: this },
    );

    this.registerOutputs({
      api: this.api.id,
      policy: this.policy.id,
      papercutResource: this.papercutResource.id,
      secureBridgeResource: this.secureBridgeResource.id,
      logGroup: this.logGroup.id,
      deployment: this.deployment.id,
      stage: this.stage.id,
      certificate: this.certificate.id,
      domainName: this.domainName.id,
      basePathMapping: this.basePathMapping.id,
    });
  }

  public get nodes() {
    return {
      api: this.api,
      policy: this.policy,
      papercutResource: this.papercutResource,
      secureBridgeResource: this.secureBridgeResource,
      papercutSecureBridgeRoutes: this.papercutSecureBridgeRoutes,
      logGroup: this.logGroup,
      deployment: this.deployment,
      stage: this.stage,
      certificate: this.certificate,
      domainName: this.domainName,
      basePathMapping: this.basePathMapping,
    };
  }
}

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

  public constructor(
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
