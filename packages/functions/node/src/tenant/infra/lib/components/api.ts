import { Utils } from "@printworks/core/utils";
import { Constants } from "@printworks/core/utils/constants";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface ApiArgs {
  gateway: aws.apigateway.RestApi;
  tenantId: pulumi.Input<string>;
  domainName: aws.acm.Certificate["domainName"];
  certificateArn: aws.acm.Certificate["arn"];
  cloudfrontKeyPairId: pulumi.Input<string>;
  papercutSecureReverseProxyFunction: {
    invokeArn: aws.lambda.Function["invokeArn"];
  };
  invoicesProcessorQueue: {
    arn: aws.sqs.Queue["arn"];
    name: aws.sqs.Queue["name"];
    url: aws.sqs.Queue["url"];
  };
  distributionId: pulumi.Input<string>;
}

export class Api extends pulumi.ComponentResource {
  static #instance: Api;

  #role: aws.iam.Role;
  #apiPolicy: aws.apigateway.RestApiPolicy;
  #domainName: aws.apigateway.DomainName;

  // NOTE: The well-known app-specific resources are following the registered IANA specification:
  // https://www.github.com/Vroo/well-known-uri-appspecific/blob/main/well-known-uri-for-application-specific-purposes.txt
  // https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml
  #wellKnownResource: aws.apigateway.Resource;
  #appSpecificResource: aws.apigateway.Resource;
  #wellKnownAppSpecificRoutes: Array<WellKnownAppSpecificRoute> = [];

  #parametersResource: aws.apigateway.Resource;
  #parametersProxyResource: aws.apigateway.Resource;
  #parametersProxyMethod: aws.apigateway.Method;
  #parametersProxyIntegration: aws.apigateway.Integration;
  #parametersProxyCorsRoute: CorsRoute;

  #usersResource: aws.apigateway.Resource;
  #usersSyncRoute: EventRoute;

  #papercutResource: aws.apigateway.Resource;
  #papercutProxyResource: aws.apigateway.Resource;
  #papercutProxyMethod: aws.apigateway.Method;
  #papercutProxyIntegration: aws.apigateway.Integration;
  #papercutProxyCorsRoute: CorsRoute;

  #invoicesResource: aws.apigateway.Resource;
  #enqueueInvoiceRequestValidator: aws.apigateway.RequestValidator;
  #enqueueInvoiceRequestModel: aws.apigateway.Model;
  #enqueueInvoiceMethod: aws.apigateway.Method;
  #enqueueInvoiceIntegration: aws.apigateway.Integration;
  #enqueueInvoiceCorsRoute: CorsRoute;

  #cdnResource: aws.apigateway.Resource;
  #invalidationResource: aws.apigateway.Resource;
  #invalidationRequestValidator: aws.apigateway.RequestValidator;
  #invalidationRequestModel: aws.apigateway.Model;
  #invalidationMethod: aws.apigateway.Method;
  #invalidationIntegration: aws.apigateway.Integration;
  #invalidationCorsRoute: CorsRoute;

  #corsResponse4xx: aws.apigateway.Response;
  #corsResponse5xx: aws.apigateway.Response;

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
    const { AppData, Aws, UsersSync, Web } = useResource();

    super(`${AppData.name}:tenant:aws:Api`, "Api", args, opts);

    const region = aws.getRegionOutput({}, { parent: this });

    this.#role = new aws.iam.Role(
      "Role",
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: "apigateway.amazonaws.com",
        }),
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
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["ssm:GetParameter", "kms:Decrypt"],
                resources: [
                  Constants.MAX_FILE_SIZES_PARAMETER_NAME,
                  Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
                  Constants.PAPERCUT_SERVER_AUTH_TOKEN_PARAMETER_NAME,
                ].map(
                  (name) =>
                    pulumi.interpolate`arn:aws:ssm::${aws.getCallerIdentityOutput({}, { parent: this }).accountId}:parameter${name}`,
                ),
              },
              {
                actions: ["events:PutEvents"],
                resources: [
                  aws.cloudwatch.getEventBusOutput(
                    { name: "default" },
                    { parent: this },
                  ).arn,
                ],
              },
              {
                actions: ["sqs:SendMessage"],
                resources: [args.invoicesProcessorQueue.arn],
              },
              {
                actions: ["cloudfront:CreateInvalidation"],
                resources: [
                  aws.cloudfront.getDistributionOutput(
                    { id: args.distributionId },
                    { parent: this },
                  ).arn,
                ],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.#apiPolicy = new aws.apigateway.RestApiPolicy(
      "ApiPolicy",
      {
        restApiId: args.gateway.id,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                principals: [
                  {
                    type: "AWS",
                    identifiers: [UsersSync.roleArn, Web.server.role.principal],
                  },
                ],
                actions: ["execute-api:Invoke"],
                resources: [pulumi.interpolate`${args.gateway.executionArn}/*`],
                conditions:
                  Web.server.role.principal === "*"
                    ? [
                        {
                          test: "StringLike",
                          variable: "aws:PrincipalArn",
                          values: [
                            pulumi.interpolate`arn:aws.iam::${Aws.account.id}:role/*`,
                          ],
                        },
                      ]
                    : undefined,
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.#domainName = new aws.apigateway.DomainName(
      "DomainName",
      {
        domainName: args.domainName,
        endpointConfiguration: args.gateway.endpointConfiguration,
        regionalCertificateArn: args.certificateArn,
      },
      { parent: this },
    );

    this.#wellKnownResource = new aws.apigateway.Resource(
      "WellKnownResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: ".well-known",
      },
      { parent: this },
    );

    this.#appSpecificResource = new aws.apigateway.Resource(
      "AppSpecificResource",
      {
        restApi: args.gateway.id,
        parentId: this.#wellKnownResource.id,
        pathPart: "appspecific",
      },
      { parent: this },
    );

    this.#wellKnownAppSpecificRoutes.push(
      new WellKnownAppSpecificRoute(
        "AccountId",
        {
          apiId: args.gateway.id,
          parentId: this.#appSpecificResource.id,
          pathPart: args.domainName.apply(
            (domainName) => `${Utils.reverseDns(domainName)}.account-id.txt`,
          ),
          responseTemplates: {
            "text/plain": aws.getCallerIdentityOutput({}, { parent: this })
              .accountId,
          },
        },
        { parent: this },
      ),
    );

    this.#wellKnownAppSpecificRoutes.push(
      new WellKnownAppSpecificRoute(
        "CloudfrontKeyPairId",
        {
          apiId: args.gateway.id,
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

    this.#parametersResource = new aws.apigateway.Resource(
      "ParametersResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "parameters",
      },
      { parent: this },
    );

    this.#parametersProxyResource = new aws.apigateway.Resource(
      "ParametersProxyResource",
      {
        restApi: args.gateway.id,
        parentId: this.#parametersResource.id,
        pathPart: "{proxy+}",
      },
      { parent: this },
    );

    this.#parametersProxyMethod = new aws.apigateway.Method(
      "ParametersProxyMethod",
      {
        restApi: args.gateway.id,
        resourceId: this.#parametersProxyResource.id,
        httpMethod: "GET",
        authorization: "AWS_IAM",
      },
      { parent: this },
    );

    this.#parametersProxyIntegration = new aws.apigateway.Integration(
      "ParametersProxyIntegration",
      {
        restApi: args.gateway.id,
        resourceId: this.#parametersProxyResource.id,
        httpMethod: this.#parametersProxyMethod.httpMethod,
        type: "AWS",
        integrationHttpMethod: "POST",
        requestTemplates: {
          "application/json": `
{
  "Name": "$util.escapeJavaScript($input.params().path.get('proxy'))"
  #if($input.params().header.get('X-With-Decryption') == 'true')
  ,"WithDecryption": true
  #end
  #if($input.params().header.get('X-Overwrite') == 'true')
  ,"Overwrite": true
  #end
}`,
        },
        passthroughBehavior: "NEVER",
        uri: pulumi.interpolate`arn:aws:apigateway:${region}:ssm:action/GetParameter`,
        credentials: this.#role.arn,
      },
      { parent: this },
    );

    this.#parametersProxyCorsRoute = new CorsRoute(
      "ParametersProxy",
      {
        restApiId: args.gateway.id,
        resourceId: this.#parametersProxyResource.id,
      },
      { parent: this },
    );

    this.#usersResource = new aws.apigateway.Resource(
      "UsersResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "users",
      },
      { parent: this },
    );

    this.#usersSyncRoute = new EventRoute(
      "UsersSync",
      {
        restApiId: args.gateway.id,
        parentId: this.#usersResource.id,
        pathPart: "sync",
        executionRoleArn: this.#role.arn,
        requestTemplate: pulumi.all([args.tenantId, args.domainName]).apply(
          ([tenantId, domainName]) => `
{
  "Entries": [
    {
      "Detail": "{\\"tenantId\\":\\"${tenantId}\\"}",
      "DetailType": "UsersSync",
      "EventBusName": "default",
      "Source":"${Utils.reverseDns(domainName)}"
    }
  ]
}`,
        ),
      },
      { parent: this },
    );

    this.#papercutResource = new aws.apigateway.Resource(
      "PapercutResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "papercut",
      },
      { parent: this },
    );

    this.#papercutProxyResource = new aws.apigateway.Resource(
      "PapercutProxyResource",
      {
        restApi: args.gateway.id,
        parentId: this.#papercutResource.id,
        pathPart: "{proxy+}",
      },
      { parent: this },
    );

    this.#papercutProxyMethod = new aws.apigateway.Method(
      "PapercutProxyMethod",
      {
        restApi: args.gateway.id,
        resourceId: this.#papercutProxyResource.id,
        httpMethod: "ANY",
        authorization: "AWS_IAM",
      },
      { parent: this },
    );

    this.#papercutProxyIntegration = new aws.apigateway.Integration(
      "PapercutProxyIntegration",
      {
        restApi: args.gateway.id,
        resourceId: this.#papercutProxyResource.id,
        httpMethod: this.#papercutProxyMethod.httpMethod,
        type: "AWS_PROXY",
        integrationHttpMethod: "POST",
        passthroughBehavior: "WHEN_NO_TEMPLATES",
        uri: args.papercutSecureReverseProxyFunction.invokeArn,
        credentials: this.#role.arn,
      },
      { parent: this },
    );

    this.#papercutProxyCorsRoute = new CorsRoute(
      "PapercutProxy",
      {
        restApiId: args.gateway.id,
        resourceId: this.#papercutProxyResource.id,
      },
      { parent: this },
    );

    this.#invoicesResource = new aws.apigateway.Resource(
      "InvoicesResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "invoices",
      },
      { parent: this },
    );

    this.#enqueueInvoiceRequestValidator = new aws.apigateway.RequestValidator(
      "EnqueueInvoiceRequestValidator",
      {
        restApi: args.gateway.id,
        validateRequestBody: true,
        validateRequestParameters: false,
      },
      { parent: this },
    );

    this.#enqueueInvoiceRequestModel = new aws.apigateway.Model(
      "EnqueueInvoiceRequestModel",
      {
        restApi: args.gateway.id,
        contentType: "application/json",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "EnqueueInvoiceRequestModel",
          type: "object",
          properties: {
            invoiceId: {
              type: "string",
            },
          },
          required: ["invoiceId"],
          additionalProperties: false,
        }),
      },
      { parent: this },
    );

    this.#enqueueInvoiceMethod = new aws.apigateway.Method(
      "EnqueueInvoiceMethod",
      {
        restApi: args.gateway.id,
        resourceId: this.#invoicesResource.id,
        httpMethod: "POST",
        authorization: "AWS_IAM",
        requestValidatorId: this.#enqueueInvoiceRequestValidator.id,
        requestModels: {
          "application/json": this.#enqueueInvoiceRequestModel.id,
        },
      },
      { parent: this },
    );

    this.#enqueueInvoiceIntegration = new aws.apigateway.Integration(
      "EnqueueInvoiceIntegration",
      {
        restApi: args.gateway.id,
        resourceId: this.#invoicesResource.id,
        httpMethod: this.#enqueueInvoiceMethod.httpMethod,
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
  "QueueUrl": "${args.invoicesProcessorQueue.url}",
  "MessageBody": "{\"invoiceId\":\"$input.path('$.invoiceId')\",\"tenantId\":\"${args.tenantId}\"}"
}`,
        },
        passthroughBehavior: "NEVER",
        uri: pulumi.interpolate`arn:aws:apigateway:${region}:sqs:path/${args.invoicesProcessorQueue.name}`,
        credentials: this.#role.arn,
      },
      { parent: this },
    );

    this.#enqueueInvoiceCorsRoute = new CorsRoute(
      "EnqueueInvoice",
      {
        restApiId: args.gateway.id,
        resourceId: this.#invoicesResource.id,
      },
      { parent: this },
    );

    this.#cdnResource = new aws.apigateway.Resource(
      "CdnResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "cdn",
      },
      { parent: this },
    );

    this.#invalidationResource = new aws.apigateway.Resource(
      "InvalidationResource",
      {
        restApi: args.gateway.id,
        parentId: this.#cdnResource.id,
        pathPart: "invalidation",
      },
      { parent: this },
    );

    this.#invalidationRequestValidator = new aws.apigateway.RequestValidator(
      "InvalidationRequestValidator",
      {
        restApi: args.gateway.id,
        validateRequestBody: true,
        validateRequestParameters: false,
      },
      { parent: this },
    );

    this.#invalidationRequestModel = new aws.apigateway.Model(
      "InvalidationRequestModel",
      {
        restApi: args.gateway.id,
        contentType: "application/json",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "invalidationRequestModel",
          type: "object",
          properties: {
            paths: {
              type: "array",
              minItems: 1,
              maxItems: 100,
              items: {
                type: "string",
                pattern: "^/.*$",
                minLength: 1,
                maxLength: 4096,
              },
            },
          },
          required: ["paths"],
          additionalProperties: false,
        }),
      },
      { parent: this },
    );

    this.#invalidationMethod = new aws.apigateway.Method(
      "InvalidationMethod",
      {
        restApi: args.gateway.id,
        resourceId: this.#invalidationResource.id,
        httpMethod: "POST",
        authorization: "AWS_IAM",
        requestValidatorId: this.#invalidationRequestValidator.id,
        requestModels: {
          "application/json": this.#invalidationRequestModel.name,
        },
      },
      { parent: this },
    );

    this.#invalidationIntegration = new aws.apigateway.Integration(
      "InvalidationIntegration",
      {
        restApi: args.gateway.id,
        resourceId: this.#invalidationResource.id,
        httpMethod: this.#invalidationMethod.httpMethod,
        type: "AWS",
        integrationHttpMethod: "POST",
        requestParameters: {
          "integration.request.header.Content-Type": "'application/xml'",
        },
        requestTemplates: {
          "application/json": pulumi.interpolate`
#set($paths = $input.path('$.paths'))
#set($quantity = $paths.size())
<?xml version="1.0" encoding="UTF-8"?>
<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2020-05-31/">
  <CallerReference>$context.requestId</CallerReference>
  <Paths>
    <Quantity>$quantity</Quantity>
    <Items>
      #foreach($path in $paths)
        <Path>$path</Path>
      #end
    </Items>
  </Paths>
</InvalidationBatch>`,
        },
        passthroughBehavior: "NEVER",
        uri: pulumi.interpolate`arn:aws:apigateway:${region}:cloudfront:path/${args.distributionId}/invalidation`,
        credentials: this.#role.arn,
      },
      { parent: this },
    );

    this.#invalidationCorsRoute = new CorsRoute(
      "Invalidation",
      {
        restApiId: args.gateway.id,
        resourceId: this.#invalidationResource.id,
      },
      { parent: this },
    );

    this.#corsResponse4xx = new aws.apigateway.Response(
      "CorsResponse4xx",
      {
        restApiId: args.gateway.id,
        responseType: "DEFAULT_4XX",
        responseParameters: {
          "gatewayresponse.header.Access-Control-Allow-Origin": "'*'",
          "gatewayresponse.header.Access-Control-Allow-Headers": "'*'",
        },
        responseTemplates: {
          "application/json": '{"message":$context.error.messageString}',
        },
      },
      { parent: this },
    );

    this.#corsResponse5xx = new aws.apigateway.Response(
      "CorsResponse5xx",
      {
        restApiId: args.gateway.id,
        responseType: "DEFAULT_5XX",
        responseParameters: {
          "gatewayresponse.header.Access-Control-Allow-Origin": "'*'",
          "gatewayresponse.header.Access-Control-Allow-Headers": "'*'",
        },
        responseTemplates: {
          "application/json": '{"message":$context.error.messageString}',
        },
      },
      { parent: this },
    );

    this.#logGroup = new aws.cloudwatch.LogGroup(
      "LogGroup",
      {
        name: pulumi.interpolate`/aws/vendedlogs/apis/${args.gateway.name}`,
        retentionInDays: 14,
      },
      { parent: this },
    );

    const triggers = pulumi
      .all([
        args.gateway,

        this.#wellKnownResource,
        this.#appSpecificResource,
        ...this.#wellKnownAppSpecificRoutes.flatMap((route) => [
          route.resource,
          route.method,
          route.integration,
          route.corsRoute.method,
          route.corsRoute.integration,
          route.corsRoute.integrationResponse,
          route.corsRoute.methodResponse,
        ]),

        this.#parametersResource,
        this.#parametersProxyResource,
        this.#parametersProxyMethod,
        this.#parametersProxyIntegration,
        this.#parametersProxyCorsRoute.method,
        this.#parametersProxyCorsRoute.integration,
        this.#parametersProxyCorsRoute.integrationResponse,
        this.#parametersProxyCorsRoute.methodResponse,

        this.#usersResource,
        this.#usersSyncRoute.method,
        this.#usersSyncRoute.integration,
        this.#usersSyncRoute.corsRoute.method,
        this.#usersSyncRoute.corsRoute.integration,
        this.#usersSyncRoute.corsRoute.integrationResponse,
        this.#usersSyncRoute.corsRoute.methodResponse,

        this.#papercutResource,
        this.#papercutProxyResource,
        this.#papercutProxyMethod,
        this.#papercutProxyIntegration,
        this.#papercutProxyCorsRoute.method,
        this.#papercutProxyCorsRoute.integration,
        this.#papercutProxyCorsRoute.integrationResponse,
        this.#papercutProxyCorsRoute.methodResponse,

        this.#invoicesResource,
        this.#enqueueInvoiceRequestValidator,
        this.#enqueueInvoiceRequestModel,
        this.#enqueueInvoiceMethod,
        this.#enqueueInvoiceIntegration,
        this.#enqueueInvoiceCorsRoute.method,
        this.#enqueueInvoiceCorsRoute.integration,
        this.#enqueueInvoiceCorsRoute.integrationResponse,
        this.#enqueueInvoiceCorsRoute.methodResponse,

        this.#cdnResource,
        this.#invalidationResource,
        this.#invalidationRequestValidator,
        this.#invalidationRequestModel,
        this.#invalidationMethod,
        this.#invalidationIntegration,
        this.#invalidationCorsRoute.method,
        this.#invalidationCorsRoute.integration,

        this.#corsResponse4xx,
        this.#corsResponse5xx,
      ])
      // filter serializable outputs
      .apply((resources) =>
        resources.map((resource) =>
          Object.fromEntries(
            Object.entries(resource).filter(
              ([key, value]) =>
                !key.startsWith("_") && typeof value !== "function",
            ),
          ),
        ),
      )
      .apply((resources) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        Object.fromEntries(
          resources.map((resource) => [resource.urn, JSON.stringify(resource)]),
        ),
      );

    this.#deployment = new aws.apigateway.Deployment(
      "Deployment",
      {
        restApi: args.gateway.id,
        triggers,
      },
      { parent: this },
    );

    this.#stage = new aws.apigateway.Stage(
      "Stage",
      {
        restApi: args.gateway.id,
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
      apiPolicy: this.#apiPolicy.id,
      domainName: this.#domainName.id,

      wellKnownResource: this.#wellKnownResource.id,
      appSpecificResource: this.#appSpecificResource.id,

      parametersResource: this.#parametersResource.id,
      parametersProxyResource: this.#parametersProxyResource.id,
      parametersProxyMethod: this.#parametersProxyMethod.id,
      parametersProxyIntegration: this.#parametersProxyIntegration.id,

      usersResource: this.#usersResource.id,

      papercutResource: this.#papercutResource.id,
      papercutProxyResource: this.#papercutProxyResource.id,
      papercutProxyMethod: this.#papercutProxyMethod.id,
      papercutProxyIntegration: this.#papercutProxyIntegration.id,

      invoicesResource: this.#invoicesResource.id,
      enqueueInvoiceRequestValidator: this.#enqueueInvoiceRequestValidator.id,
      enqueueInvoiceRequestModel: this.#enqueueInvoiceRequestModel.id,
      enqueueInvoiceMethod: this.#enqueueInvoiceMethod.id,
      enqueueInvoiceIntegration: this.#enqueueInvoiceIntegration.id,

      cdnResource: this.#cdnResource.id,
      invalidationResource: this.#invalidationResource.id,
      invalidationRequestValidator: this.#invalidationRequestValidator.id,
      invalidationRequestModel: this.#invalidationRequestModel.id,
      invalidationMethod: this.#invalidationMethod.id,
      invalidationIntegration: this.#invalidationIntegration.id,

      corsResponse4xx: this.#corsResponse4xx.id,
      corsResponse5xx: this.#corsResponse5xx.id,

      logGroup: this.#logGroup.id,
      deployment: this.#deployment.id,
      stage: this.#stage.id,
    });
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
  #corsRoute: CorsRoute;

  constructor(
    name: string,
    args: WellKnownAppSpecificRouteArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(
      `${AppData.name}:tenant:aws:WellKnownAppSpecificRoute`,
      `${name}WellKnownAppSpecificRoute`,
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

    this.#corsRoute = new CorsRoute(
      `${name}WellKnownAppSpecificRoute`,
      {
        restApiId: args.apiId,
        resourceId: this.#resource.id,
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

  get resource() {
    return this.#resource;
  }

  get method() {
    return this.#method;
  }

  get integration() {
    return this.#integration;
  }

  get corsRoute() {
    return this.#corsRoute;
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
  #corsRoute: CorsRoute;

  constructor(
    name: string,
    args: EventRouteArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(
      `${AppData.name}:tenant:aws:EventRoute`,
      `${name}EventRoute`,
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
        uri: pulumi.interpolate`arn:aws:apigateway:${aws.getRegionOutput({}, { parent: this }).name}:events:action/PutEvents`,
        credentials: args.executionRoleArn,
      },
      { parent: this },
    );

    this.#corsRoute = new CorsRoute(
      `${name}Event`,
      {
        restApiId: args.restApiId,
        resourceId: this.#resource.id,
      },
      { parent: this },
    );

    this.registerOutputs({
      resource: this.#resource.id,
      method: this.#method.id,
      integration: this.#integration.id,
    });
  }

  get resource() {
    return this.#resource;
  }

  get method() {
    return this.#method;
  }

  get integration() {
    return this.#integration;
  }

  get corsRoute() {
    return this.#corsRoute;
  }
}

interface CorsRouteArgs {
  restApiId: aws.apigateway.RestApi["id"];
  resourceId: aws.apigateway.Resource["id"];
}

class CorsRoute extends pulumi.ComponentResource {
  #method: aws.apigateway.Method;
  #integration: aws.apigateway.Integration;
  #integrationResponse: aws.apigateway.IntegrationResponse;
  #methodResponse: aws.apigateway.MethodResponse;

  constructor(
    name: string,
    args: CorsRouteArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(
      `${AppData.name}:tenant:aws:CorsRoute`,
      `${name}CorsRoute`,
      args,
      opts,
    );

    this.#method = new aws.apigateway.Method(
      `${name}CorsMethod`,
      {
        restApi: args.restApiId,
        resourceId: args.resourceId,
        httpMethod: "OPTIONS",
        authorization: "NONE",
      },
      { parent: this },
    );

    this.#integration = new aws.apigateway.Integration(
      `${name}CorsIntegration`,
      {
        restApi: args.restApiId,
        resourceId: args.resourceId,
        httpMethod: this.#method.httpMethod,
        type: "MOCK",
        requestTemplates: {
          "application/json": JSON.stringify({ statusCode: 200 }),
        },
      },
      { parent: this },
    );

    this.#integrationResponse = new aws.apigateway.IntegrationResponse(
      `${name}CorsIntegrationResponse`,
      {
        restApi: args.restApiId,
        resourceId: args.resourceId,
        httpMethod: this.#method.httpMethod,
        statusCode: "204",
        responseTemplates: {
          "method.response.header.Access-Control-Allow-Headers": "'*'",
          "method.response.header.Access-Control-Allow-Methods":
            "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
          "method.response.header.Access-Control-Allow-Origin": "'*'",
        },
      },
      { parent: this, dependsOn: [this.#integration] },
    );

    this.#methodResponse = new aws.apigateway.MethodResponse(
      `${name}CorsMethodResponse`,
      {
        restApi: args.restApiId,
        resourceId: args.resourceId,
        httpMethod: this.#method.httpMethod,
        statusCode: this.#integrationResponse.statusCode,
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true,
          "method.response.header.Access-Control-Allow-Origin": true,
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      method: this.#method.id,
      integration: this.#integration.id,
      integrationResponse: this.#integrationResponse.id,
      methodResponse: this.#methodResponse.id,
    });
  }

  get method() {
    return this.#method;
  }

  get integration() {
    return this.#integration;
  }

  get integrationResponse() {
    return this.#integrationResponse;
  }

  get methodResponse() {
    return this.#methodResponse;
  }
}
