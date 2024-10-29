import { Utils } from "@paperwait/core/utils";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface ApiArgs {
  tenantId: pulumi.Input<string>;
  domainName: aws.acm.Certificate["domainName"];
  certificateArn: aws.acm.Certificate["arn"];
  cloudfrontKeyPairId: pulumi.Input<string>;
  papercutSecureBridgeFunction: {
    invokeArn: aws.lambda.Function["invokeArn"];
  };
  orderProcessorQueue: {
    arn: aws.sqs.Queue["arn"];
    name: aws.sqs.Queue["name"];
    url: aws.sqs.Queue["url"];
  };
}

export class Api extends pulumi.ComponentResource {
  static #instance: Api;

  #role: aws.iam.Role;
  #api: aws.apigateway.RestApi;
  #apiPolicy: aws.apigateway.RestApiPolicy;
  #domainName: aws.apigateway.DomainName;

  // NOTE: The well-known app-specific resources are following the registered IANA specification:
  // https://www.github.com/Vroo/well-known-uri-appspecific/blob/main/well-known-uri-for-application-specific-purposes.txt
  // https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml
  #wellKnownResource: aws.apigateway.Resource;
  #appSpecificResource: aws.apigateway.Resource;
  #wellKnownAppSpecificRoutes: Array<WellKnownAppSpecificRoute> = [];

  #eventsResource: aws.apigateway.Resource;
  #eventRoutes: Array<EventRoute> = [];

  #papercutResource: aws.apigateway.Resource;
  #secureBridgeResource: aws.apigateway.Resource;
  #papercutSecureBridgeRoutes: Array<PapercutSecureBridgeRoute> = [];

  #ordersResource: aws.apigateway.Resource;
  #enqueueOrderRequestValidator: aws.apigateway.RequestValidator;
  #enqueueOrderRequestModel: aws.apigateway.Model;
  #enqueueOrderMethod: aws.apigateway.Method;
  #enqueueOrderIntegration: aws.apigateway.Integration;

  #logGroup: aws.cloudwatch.LogGroup;
  #deployment: aws.apigateway.Deployment;
  #stage: aws.apigateway.Stage;

  static getInstance(
    args: ApiArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Api {
    if (!this.#instance) this.#instance = new Api(args, opts);

    return this.#instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Api.getInstance>) {
    const { AppData, Cloud, UserSync, Web } = useResource();

    super(`${AppData.name}:tenant:aws:Api`, "Api", args, opts);

    this.#role = new aws.iam.Role(
      "Role",
      {
        assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              principals: [
                {
                  type: "Service",
                  identifiers: ["apigateway.amazonaws.com"],
                },
              ],
              actions: ["sts:AssumeRole"],
            },
          ],
        }).json,
        managedPolicyArns: [
          aws.iam.ManagedPolicy.AmazonAPIGatewayPushToCloudWatchLogs,
        ],
      },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "RoleInlinePolicy",
      {
        role: this.#role,
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["events:PutEvents"],
              resources: [
                aws.cloudwatch.getEventBusOutput({ name: "default" }).arn,
              ],
            },
            {
              actions: ["sqs:SendMessage"],
              resources: [args.orderProcessorQueue.arn],
            },
          ],
        }).json,
      },
      { parent: this },
    );

    this.#api = new aws.apigateway.RestApi(
      "Api",
      {
        endpointConfiguration: {
          types: "REGIONAL",
        },
      },
      { parent: this },
    );

    this.#apiPolicy = new aws.apigateway.RestApiPolicy(
      "ApiPolicy",
      {
        restApiId: this.#api.id,
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              principals: [
                {
                  type: "AWS",
                  identifiers: [UserSync.roleArn, Web.server.role.principal],
                },
              ],
              actions: ["execute-api:Invoke"],
              resources: [pulumi.interpolate`${this.#api.executionArn}/*`],
              conditions:
                Web.server.role.principal === "*"
                  ? [
                      {
                        test: "StringLike",
                        variable: "aws:PrincipalArn",
                        values: [
                          pulumi.interpolate`arn:aws.iam::${Cloud.aws.account.id}:role/*`,
                        ],
                      },
                    ]
                  : undefined,
            },
          ],
        }).json,
      },
      { parent: this },
    );

    this.#domainName = new aws.apigateway.DomainName(
      "DomainName",
      {
        domainName: args.domainName,
        endpointConfiguration: this.#api.endpointConfiguration,
        regionalCertificateArn: args.certificateArn,
      },
      { parent: this },
    );

    this.#wellKnownResource = new aws.apigateway.Resource(
      "WellKnownResource",
      {
        restApi: this.#api.id,
        parentId: this.#api.rootResourceId,
        pathPart: ".well-known",
      },
      { parent: this },
    );

    this.#appSpecificResource = new aws.apigateway.Resource(
      "AppSpecificResource",
      {
        restApi: this.#api.id,
        parentId: this.#wellKnownResource.id,
        pathPart: "appspecific",
      },
      { parent: this },
    );

    this.#wellKnownAppSpecificRoutes.push(
      new WellKnownAppSpecificRoute(
        "CloudfrontKeyPairIdRoute",
        {
          apiId: this.#api.id,
          parentId: this.#appSpecificResource.id,
          pathPart: args.domainName.apply(
            (domainName) =>
              `${Utils.reverseDns(domainName)}.cloudfront-key-pair-id.txt`,
          ),
          responseTemplates: {
            "text/plain": args.cloudfrontKeyPairId,
          },
        },
        { parent: this },
      ),
    );

    this.#eventsResource = new aws.apigateway.Resource(
      "EventsResource",
      {
        restApi: this.#api.id,
        parentId: this.#api.rootResourceId,
        pathPart: "events",
      },
      { parent: this },
    );

    this.#eventRoutes.push(
      new EventRoute(
        "TailscaleAuthKeyRotationRoute",
        {
          restApiId: this.#api.id,
          parentId: this.#eventsResource.id,
          pathPart: "tailscale-auth-key-rotation",
          executionRoleArn: this.#role.arn,
          requestTemplate: args.domainName.apply(
            (domainName) => `
{
"Entries": [
  {
    "Detail": "{}",
    "DetailType": "tailscale-auth-key-rotation",
    "EventBusName": "default",
    "Source":"${Utils.reverseDns(domainName)}"
  }
]
}`,
          ),
        },
        { parent: this },
      ),
    );

    this.#eventRoutes.push(
      new EventRoute(
        "UserSyncRoute",
        {
          restApiId: this.#api.id,
          parentId: this.#eventsResource.id,
          pathPart: "user-sync",
          executionRoleArn: this.#role.arn,
          requestTemplate: pulumi.all([args.tenantId, args.domainName]).apply(
            ([tenantId, domainName]) => `
{
"Entries": [
  {
    "Detail": "{\\"tenantId\\":\\"${tenantId}\\"}",
    "DetailType": "user-sync",
    "EventBusName": "default",
    "Source":"${Utils.reverseDns(domainName)}"
  }
]
}`,
          ),
        },
        { parent: this },
      ),
    );

    this.#papercutResource = new aws.apigateway.Resource(
      "PapercutResource",
      {
        restApi: this.#api.id,
        parentId: this.#api.rootResourceId,
        pathPart: "papercut",
      },
      { parent: this },
    );

    this.#secureBridgeResource = new aws.apigateway.Resource(
      "SecureBridgeResource",
      {
        restApi: this.#api.id,
        parentId: this.#papercutResource.id,
        pathPart: "secure-bridge",
      },
      { parent: this },
    );

    this.#papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "AdjustSharedAccountAccountBalanceRoute",
        {
          restApiId: this.#api.id,
          parentId: this.#secureBridgeResource.id,
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
          invokeArn: args.papercutSecureBridgeFunction.invokeArn,
          executionRoleArn: this.#role.arn,
        },
        { parent: this },
      ),
    );

    this.#papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "GetSharedAccountPropertiesRoute",
        {
          restApiId: this.#api.id,
          parentId: this.#secureBridgeResource.id,
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
          invokeArn: args.papercutSecureBridgeFunction.invokeArn,
          executionRoleArn: this.#role.arn,
        },
        { parent: this },
      ),
    );

    this.#papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "GetTaskStatusRoute",
        {
          restApiId: this.#api.id,
          parentId: this.#secureBridgeResource.id,
          pathPart: "getTaskStatus",
          invokeArn: args.papercutSecureBridgeFunction.invokeArn,
          executionRoleArn: this.#role.arn,
        },
        { parent: this },
      ),
    );

    this.#papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "IsUserExistsRoute",
        {
          restApiId: this.#api.id,
          parentId: this.#secureBridgeResource.id,
          pathPart: "isUserExists",
          requestSchema: {
            username: {
              type: "string",
            },
          },
          invokeArn: args.papercutSecureBridgeFunction.invokeArn,
          executionRoleArn: this.#role.arn,
        },
        { parent: this },
      ),
    );

    this.#papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "ListSharedAccountsRoute",
        {
          restApiId: this.#api.id,
          parentId: this.#secureBridgeResource.id,
          pathPart: "listSharedAccounts",
          requestSchema: {
            offset: {
              type: "integer",
            },
            limit: {
              type: "integer",
            },
          },
          invokeArn: args.papercutSecureBridgeFunction.invokeArn,
          executionRoleArn: this.#role.arn,
        },
        { parent: this },
      ),
    );

    this.#papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "ListUserAccounts",
        {
          restApiId: this.#api.id,
          parentId: this.#secureBridgeResource.id,
          pathPart: "listUserAccounts",
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
          },
          invokeArn: args.papercutSecureBridgeFunction.invokeArn,
          executionRoleArn: this.#role.arn,
        },
        { parent: this },
      ),
    );

    this.#papercutSecureBridgeRoutes.push(
      new PapercutSecureBridgeRoute(
        "ListUserSharedAccountsRoute",
        {
          restApiId: this.#api.id,
          parentId: this.#secureBridgeResource.id,
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
          invokeArn: args.papercutSecureBridgeFunction.invokeArn,
          executionRoleArn: this.#role.arn,
        },
        { parent: this },
      ),
    );

    this.#ordersResource = new aws.apigateway.Resource(
      "OrdersResource",
      {
        restApi: this.#api.id,
        parentId: this.#api.rootResourceId,
        pathPart: "orders",
      },
      { parent: this },
    );

    this.#enqueueOrderRequestValidator = new aws.apigateway.RequestValidator(
      "EnqueueOrderRequestValidator",
      {
        restApi: this.#api.id,
        validateRequestBody: true,
        validateRequestParameters: false,
      },
      { parent: this },
    );

    this.#enqueueOrderRequestModel = new aws.apigateway.Model(
      "EnqueueOrderRequestModel",
      {
        restApi: this.#api.id,
        contentType: "application/json",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "EnqueueOrderRequestModel",
          type: "object",
          properties: {
            orderId: {
              type: "string",
            },
          },
        }),
      },
      { parent: this },
    );

    this.#enqueueOrderMethod = new aws.apigateway.Method(
      "EnqueueOrderMethod",
      {
        restApi: this.#api.id,
        resourceId: this.#ordersResource.id,
        httpMethod: "POST",
        authorization: "AWS_IAM",
        requestValidatorId: this.#enqueueOrderRequestValidator.id,
        requestModels: {
          "application/json": this.#enqueueOrderRequestModel.id,
        },
      },
      { parent: this },
    );

    this.#enqueueOrderIntegration = new aws.apigateway.Integration(
      "EnqueueOrderIntegration",
      {
        restApi: this.#api.id,
        resourceId: this.#ordersResource.id,
        httpMethod: this.#enqueueOrderMethod.httpMethod,
        type: "AWS",
        integrationHttpMethod: "POST",
        requestParameters: {
          "integration.request.header.Content-Type":
            "'application/x-amz-json-1.1'",
          "integration.request.header.X-Amz-Target": "'SQS.SendMessage'",
        },
        requestTemplates: {
          "application/json": pulumi.interpolate`
{
  "QueueUrl": "${args.orderProcessorQueue.url}",
  "MessageBody": "{\"orderId\":\"$input.path('$.orderId')\",\"tenantId\":\"${args.tenantId}\"}"
}`,
        },
        passthroughBehavior: "NEVER",
        uri: pulumi.interpolate`arn:aws:apigateway:${Cloud.aws.region}:sqs:path/${args.orderProcessorQueue.name}`,
        credentials: this.#role.arn,
      },
      { parent: this },
    );

    this.#logGroup = new aws.cloudwatch.LogGroup(
      "LogGroup",
      {
        name: pulumi.interpolate`/aws/vendedlogs/apis/${this.#api.name}`,
        retentionInDays: 14,
      },
      { parent: this },
    );

    this.#deployment = new aws.apigateway.Deployment(
      "Deployment",
      {
        restApi: this.#api.id,
        // TODO: Better triggers based on above resources
        triggers: {
          deployedAt: new Date().toISOString(),
        },
      },
      { parent: this },
    );

    this.#stage = new aws.apigateway.Stage(
      "Stage",
      {
        restApi: this.#api.id,
        stageName: AppData.stage,
        deployment: this.#deployment.id,
        accessLogSettings: {
          destinationArn: this.#logGroup.arn,
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
      { parent: this },
    );

    this.registerOutputs({
      role: this.#role.id,
      api: this.#api.id,
      apiPolicy: this.#apiPolicy.id,
      domainName: this.#domainName.id,

      wellKnownResource: this.#wellKnownResource.id,
      appSpecificResource: this.#appSpecificResource.id,

      eventsResource: this.#eventsResource.id,

      papercutResource: this.#papercutResource.id,
      secureBridgeResource: this.#secureBridgeResource.id,

      ordersResource: this.#ordersResource.id,
      enqueueOrderMethod: this.#enqueueOrderMethod.id,
      enqueueOrderIntegration: this.#enqueueOrderIntegration.id,

      logGroup: this.#logGroup.id,
      deployment: this.#deployment.id,
      stage: this.#stage.id,
    });
  }

  get invokeUrl() {
    return this.#deployment.invokeUrl;
  }
}

interface WellKnownAppSpecificRouteArgs {
  apiId: aws.apigateway.RestApi["id"];
  parentId: pulumi.Input<string>;
  pathPart: pulumi.Input<string>;
  responseTemplates: pulumi.Input<Record<string, pulumi.Input<string>>>;
}

class WellKnownAppSpecificRoute extends pulumi.ComponentResource {
  #resource: aws.apigateway.Resource;
  #method: aws.apigateway.Method;
  #integration: aws.apigateway.Integration;
  #methodResponse: aws.apigateway.MethodResponse;
  #integrationResponse: aws.apigateway.IntegrationResponse;

  constructor(
    name: string,
    args: WellKnownAppSpecificRouteArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(
      `${AppData.name}:tenant:aws:WellKnownAppSpecificRoute`,
      name,
      args,
      opts,
    );

    this.#resource = new aws.apigateway.Resource(
      `${name}Resource`,
      {
        restApi: args.apiId,
        parentId: args.parentId,
        pathPart: args.pathPart,
      },
      { parent: this },
    );

    this.#method = new aws.apigateway.Method(
      `${name}Method`,
      {
        restApi: args.apiId,
        resourceId: this.#resource.id,
        httpMethod: "GET",
        authorization: "AWS_IAM",
      },
      { parent: this },
    );

    this.#integration = new aws.apigateway.Integration(
      `${name}Integration`,
      {
        restApi: args.apiId,
        resourceId: this.#resource.id,
        httpMethod: this.#method.httpMethod,
        type: "MOCK",
      },
      { parent: this },
    );

    this.#methodResponse = new aws.apigateway.MethodResponse(
      `${name}MethodResponse`,
      {
        restApi: args.apiId,
        resourceId: this.#resource.id,
        httpMethod: this.#method.httpMethod,
        statusCode: "200",
      },
      { parent: this },
    );

    this.#integrationResponse = new aws.apigateway.IntegrationResponse(
      `${name}IntegrationResponse`,
      {
        restApi: args.apiId,
        resourceId: this.#resource.id,
        httpMethod: this.#method.httpMethod,
        statusCode: this.#methodResponse.statusCode,
        responseTemplates: args.responseTemplates,
      },
      { parent: this },
    );

    this.registerOutputs({
      resource: this.#resource.id,
      method: this.#method.id,
      integration: this.#integration.id,
      methodResponse: this.#methodResponse.id,
      integrationResponse: this.#integrationResponse.id,
    });
  }
}

interface EventRouteArgs {
  restApiId: aws.apigateway.RestApi["id"];
  parentId: aws.apigateway.Resource["id"];
  pathPart: pulumi.Input<string>;
  requestTemplate?: pulumi.Input<string>;
  executionRoleArn: aws.iam.Role["arn"];
}

class EventRoute extends pulumi.ComponentResource {
  #resource: aws.apigateway.Resource;
  #method: aws.apigateway.Method;
  #integration: aws.apigateway.Integration;

  constructor(
    name: string,
    args: EventRouteArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData, Cloud } = useResource();

    super(`${AppData.name}:tenant:aws:EventRoute`, name, args, opts);

    this.#resource = new aws.apigateway.Resource(
      `${name}Resource`,
      {
        restApi: args.restApiId,
        parentId: args.parentId,
        pathPart: args.pathPart,
      },
      { parent: this },
    );

    this.#method = new aws.apigateway.Method(
      `${name}Method`,
      {
        restApi: args.restApiId,
        resourceId: this.#resource.id,
        httpMethod: "POST",
        authorization: "AWS_IAM",
      },
      { parent: this },
    );

    this.#integration = new aws.apigateway.Integration(
      `${name}Integration`,
      {
        restApi: args.restApiId,
        resourceId: this.#resource.id,
        httpMethod: this.#method.httpMethod,
        type: "AWS",
        integrationHttpMethod: "POST",
        requestParameters: {
          "integration.request.header.Content-Type":
            "'application/x-amz-json-1.1'",
          "integration.request.header.X-Amz-Target": "'AWSEvents.PutEvents'",
        },
        requestTemplates: args.requestTemplate
          ? { "application/json": args.requestTemplate }
          : undefined,
        passthroughBehavior: "NEVER",
        uri: pulumi.interpolate`arn:aws:apigateway:${Cloud.aws.region}:events:action/PutEvents`,
        credentials: args.executionRoleArn,
      },
      { parent: this },
    );

    this.registerOutputs({
      resource: this.#resource.id,
      method: this.#method.id,
      integration: this.#integration.id,
    });
  }
}

interface PapercutSecureBridgeRouteArgs {
  restApiId: aws.apigateway.RestApi["id"];
  parentId: aws.apigateway.Resource["id"];
  pathPart: pulumi.Input<string>;
  requestSchema?: pulumi.Input<Record<string, unknown>>;
  executionRoleArn: aws.iam.Role["arn"];
  invokeArn: aws.lambda.Function["invokeArn"];
}

class PapercutSecureBridgeRoute extends pulumi.ComponentResource {
  #resource: aws.apigateway.Resource;
  #requestValidator?: aws.apigateway.RequestValidator;
  #requestModel?: aws.apigateway.Model;
  #method: aws.apigateway.Method;
  #integration: aws.apigateway.Integration;

  constructor(
    name: string,
    args: PapercutSecureBridgeRouteArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(
      `${AppData.name}:tenant:aws:PapercutSecureBridgeRoute`,
      name,
      args,
      opts,
    );

    this.#resource = new aws.apigateway.Resource(
      `${name}Resource`,
      {
        restApi: args.restApiId,
        parentId: args.parentId,
        pathPart: args.pathPart,
      },
      { parent: this },
    );

    if (args.requestSchema) {
      this.#requestValidator = new aws.apigateway.RequestValidator(
        `${name}RequestValidator`,
        {
          restApi: args.restApiId,
          validateRequestBody: true,
          validateRequestParameters: false,
        },
        { parent: this },
      );

      this.#requestModel = new aws.apigateway.Model(
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
        { parent: this },
      );
    }

    this.#method = new aws.apigateway.Method(
      `${name}Method`,
      {
        restApi: args.restApiId,
        resourceId: this.#resource.id,
        httpMethod: "POST",
        authorization: "AWS_IAM",
        requestValidatorId:
          args.requestSchema && this.#requestValidator
            ? this.#requestValidator.id
            : undefined,
        requestModels:
          args.requestSchema && this.#requestModel
            ? { "application/json": this.#requestModel.id }
            : undefined,
      },
      { parent: this },
    );

    this.#integration = new aws.apigateway.Integration(
      `${name}Integration`,
      {
        restApi: args.restApiId,
        resourceId: this.#resource.id,
        httpMethod: this.#method.httpMethod,
        integrationHttpMethod: "POST",
        type: "AWS_PROXY",
        uri: args.invokeArn,
        credentials: args.executionRoleArn,
      },
      { parent: this },
    );

    this.registerOutputs({
      resource: this.#resource.id,
      requestValidator: this.#requestValidator?.id,
      requestModel: this.#requestModel?.id,
      method: this.#method.id,
      integration: this.#integration.id,
    });
  }
}
