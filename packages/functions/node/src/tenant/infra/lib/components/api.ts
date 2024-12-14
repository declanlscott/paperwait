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
  appsyncDns: {
    http: pulumi.Input<string>;
    realtime: pulumi.Input<string>;
  };
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
  private static _instance: Api;

  private _role: aws.iam.Role;
  private _apiPolicy: aws.apigateway.RestApiPolicy;
  private _domainName: aws.apigateway.DomainName;

  // NOTE: The well-known app-specific resources are following the registered IANA specification:
  // https://www.github.com/Vroo/well-known-uri-appspecific/blob/main/well-known-uri-for-application-specific-purposes.txt
  // https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml
  private _wellKnownResource: aws.apigateway.Resource;
  private _appSpecificResource: aws.apigateway.Resource;
  private _wellKnownAppSpecificRoutes: Array<WellKnownAppSpecificRoute> = [];

  private _parametersResource: aws.apigateway.Resource;
  private _parametersProxyResource: aws.apigateway.Resource;
  private _parametersProxyMethod: aws.apigateway.Method;
  private _parametersProxyIntegration: aws.apigateway.Integration;
  private _parametersProxyResponses: Responses;
  private _parametersProxyCorsRoute: CorsRoute;

  private _usersResource: aws.apigateway.Resource;
  private _usersSyncRoute: EventRoute;

  private _papercutResource: aws.apigateway.Resource;
  private _papercutProxyResource: aws.apigateway.Resource;
  private _papercutProxyMethod: aws.apigateway.Method;
  private _papercutProxyIntegration: aws.apigateway.Integration;
  private _papercutProxyCorsRoute: CorsRoute;

  private _invoicesResource: aws.apigateway.Resource;
  private _enqueueInvoiceRequestValidator: aws.apigateway.RequestValidator;
  private _enqueueInvoiceRequestModel: aws.apigateway.Model;
  private _enqueueInvoiceMethod: aws.apigateway.Method;
  private _enqueueInvoiceIntegration: aws.apigateway.Integration;
  private _enqueueInvoiceResponses: Responses;
  private _enqueueInvoiceCorsRoute: CorsRoute;

  private _cdnResource: aws.apigateway.Resource;
  private _invalidationResource: aws.apigateway.Resource;
  private _invalidationRequestValidator: aws.apigateway.RequestValidator;
  private _invalidationRequestModel: aws.apigateway.Model;
  private _invalidationMethod: aws.apigateway.Method;
  private _invalidationIntegration: aws.apigateway.Integration;
  private _invalidationResponses: Responses;
  private _invalidationCorsRoute: CorsRoute;

  private _corsResponse4xx: aws.apigateway.Response;
  private _corsResponse5xx: aws.apigateway.Response;

  private _logGroup: aws.cloudwatch.LogGroup;
  private _deployment: aws.apigateway.Deployment;
  private _stage: aws.apigateway.Stage;

  static getInstance(
    args: ApiArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Api {
    if (!this._instance) this._instance = new Api(args, opts);

    return this._instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Api.getInstance>) {
    const { AppData, Aws, UsersSync, Web } = useResource();

    super(`${AppData.name}:tenant:aws:Api`, "Api", args, opts);

    const region = aws.getRegionOutput({}, { parent: this });

    this._role = new aws.iam.Role(
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
        role: this._role,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["ssm:GetParameter"],
                resources: [
                  Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
                  Constants.DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME,
                  Constants.PAPERCUT_SERVER_AUTH_TOKEN_PARAMETER_NAME,
                ].map(
                  (name) =>
                    pulumi.interpolate`arn:aws:ssm::${aws.getCallerIdentityOutput({}, { parent: this }).accountId}:parameter${name}`,
                ),
              },
              {
                actions: ["kms:Decrypt"],
                resources: [
                  aws.kms.getKeyOutput(
                    { keyId: "alias/aws/ssm" },
                    { parent: this },
                  ).arn,
                ],
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

    this._apiPolicy = new aws.apigateway.RestApiPolicy(
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

    this._domainName = new aws.apigateway.DomainName(
      "DomainName",
      {
        domainName: args.domainName,
        endpointConfiguration: args.gateway.endpointConfiguration,
        regionalCertificateArn: args.certificateArn,
      },
      { parent: this },
    );

    this._wellKnownResource = new aws.apigateway.Resource(
      "WellKnownResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: ".well-known",
      },
      { parent: this },
    );

    this._appSpecificResource = new aws.apigateway.Resource(
      "AppSpecificResource",
      {
        restApi: args.gateway.id,
        parentId: this._wellKnownResource.id,
        pathPart: "appspecific",
      },
      { parent: this },
    );

    this._wellKnownAppSpecificRoutes.push(
      new WellKnownAppSpecificRoute(
        "AccountId",
        {
          apiId: args.gateway.id,
          parentId: this._appSpecificResource.id,
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

    this._wellKnownAppSpecificRoutes.push(
      new WellKnownAppSpecificRoute(
        "CloudfrontKeyPairId",
        {
          apiId: args.gateway.id,
          parentId: this._appSpecificResource.id,
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

    this._wellKnownAppSpecificRoutes.push(
      new WellKnownAppSpecificRoute(
        "AppsyncHttpDomainName",
        {
          apiId: args.gateway.id,
          parentId: this._appSpecificResource.id,
          pathPart: args.domainName.apply(
            (domainName) =>
              `${Utils.reverseDns(domainName)}.appsync-http-domain-name.txt`,
          ),
          responseTemplates: {
            "text/plain": args.appsyncDns.http,
          },
        },
        { parent: this },
      ),
    );

    this._wellKnownAppSpecificRoutes.push(
      new WellKnownAppSpecificRoute(
        "AppsyncRealtimeDomainName",
        {
          apiId: args.gateway.id,
          parentId: this._appSpecificResource.id,
          pathPart: args.domainName.apply(
            (domainName) =>
              `${Utils.reverseDns(domainName)}.appsync-realtime-domain-name.txt`,
          ),
          responseTemplates: {
            "text/plain": args.appsyncDns.realtime,
          },
        },
        { parent: this },
      ),
    );

    this._parametersResource = new aws.apigateway.Resource(
      "ParametersResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "parameters",
      },
      { parent: this },
    );

    this._parametersProxyResource = new aws.apigateway.Resource(
      "ParametersProxyResource",
      {
        restApi: args.gateway.id,
        parentId: this._parametersResource.id,
        pathPart: "{proxy+}",
      },
      { parent: this },
    );

    this._parametersProxyMethod = new aws.apigateway.Method(
      "ParametersProxyMethod",
      {
        restApi: args.gateway.id,
        resourceId: this._parametersProxyResource.id,
        httpMethod: "GET",
        authorization: "AWS_IAM",
      },
      { parent: this },
    );

    this._parametersProxyIntegration = new aws.apigateway.Integration(
      "ParametersProxyIntegration",
      {
        restApi: args.gateway.id,
        resourceId: this._parametersProxyResource.id,
        httpMethod: this._parametersProxyMethod.httpMethod,
        type: "AWS",
        integrationHttpMethod: "POST",
        requestParameters: {
          "integration.request.header.Content-Type":
            "'application/x-amz-json-1.1'",
          "integration.request.header.X-Amz-Target": "'AmazonSSM.GetParameter'",
        },
        requestTemplates: {
          "application/json": `
{
  "Name": "$util.escapeJavaScript($input.params().path.get('proxy'))"
  #if($util.escapeJavaScript($input.params().query.get('withDecryption')) == 'true')
  ,"WithDecryption": true
  #end
}`,
        },
        passthroughBehavior: "NEVER",
        uri: pulumi.interpolate`arn:aws:apigateway:${region}:ssm:path//`,
        credentials: this._role.arn,
      },
      { parent: this },
    );

    this._parametersProxyResponses = new Responses(
      "ParametersProxy",
      {
        statusCodes: ["200", "400", "403", "500", "503"],
        restApi: args.gateway.id,
        resourceId: this._parametersProxyResource.id,
        httpMethod: this._parametersProxyMethod.httpMethod,
      },
      { parent: this },
    );

    this._parametersProxyCorsRoute = new CorsRoute(
      "ParametersProxy",
      {
        restApiId: args.gateway.id,
        resourceId: this._parametersProxyResource.id,
      },
      { parent: this },
    );

    this._usersResource = new aws.apigateway.Resource(
      "UsersResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "users",
      },
      { parent: this },
    );

    this._usersSyncRoute = new EventRoute(
      "UsersSync",
      {
        restApiId: args.gateway.id,
        parentId: this._usersResource.id,
        pathPart: "sync",
        executionRoleArn: this._role.arn,
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

    this._papercutResource = new aws.apigateway.Resource(
      "PapercutResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "papercut",
      },
      { parent: this },
    );

    this._papercutProxyResource = new aws.apigateway.Resource(
      "PapercutProxyResource",
      {
        restApi: args.gateway.id,
        parentId: this._papercutResource.id,
        pathPart: "{proxy+}",
      },
      { parent: this },
    );

    this._papercutProxyMethod = new aws.apigateway.Method(
      "PapercutProxyMethod",
      {
        restApi: args.gateway.id,
        resourceId: this._papercutProxyResource.id,
        httpMethod: "ANY",
        authorization: "AWS_IAM",
      },
      { parent: this },
    );

    this._papercutProxyIntegration = new aws.apigateway.Integration(
      "PapercutProxyIntegration",
      {
        restApi: args.gateway.id,
        resourceId: this._papercutProxyResource.id,
        httpMethod: this._papercutProxyMethod.httpMethod,
        type: "AWS_PROXY",
        integrationHttpMethod: "POST",
        passthroughBehavior: "WHEN_NO_TEMPLATES",
        uri: args.papercutSecureReverseProxyFunction.invokeArn,
        credentials: this._role.arn,
      },
      { parent: this },
    );

    this._papercutProxyCorsRoute = new CorsRoute(
      "PapercutProxy",
      {
        restApiId: args.gateway.id,
        resourceId: this._papercutProxyResource.id,
      },
      { parent: this },
    );

    this._invoicesResource = new aws.apigateway.Resource(
      "InvoicesResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "invoices",
      },
      { parent: this },
    );

    this._enqueueInvoiceRequestValidator = new aws.apigateway.RequestValidator(
      "EnqueueInvoiceRequestValidator",
      {
        restApi: args.gateway.id,
        validateRequestBody: true,
        validateRequestParameters: false,
      },
      { parent: this },
    );

    this._enqueueInvoiceRequestModel = new aws.apigateway.Model(
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

    this._enqueueInvoiceMethod = new aws.apigateway.Method(
      "EnqueueInvoiceMethod",
      {
        restApi: args.gateway.id,
        resourceId: this._invoicesResource.id,
        httpMethod: "POST",
        authorization: "AWS_IAM",
        requestValidatorId: this._enqueueInvoiceRequestValidator.id,
        requestModels: {
          "application/json": this._enqueueInvoiceRequestModel.id,
        },
      },
      { parent: this },
    );

    this._enqueueInvoiceIntegration = new aws.apigateway.Integration(
      "EnqueueInvoiceIntegration",
      {
        restApi: args.gateway.id,
        resourceId: this._invoicesResource.id,
        httpMethod: this._enqueueInvoiceMethod.httpMethod,
        type: "AWS",
        integrationHttpMethod: "POST",
        requestParameters: {
          "integration.request.header.Content-Type":
            "'application/x-amz-json-1.0'",
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
        uri: pulumi.interpolate`arn:aws:apigateway:${region}:sqs:path/${aws.getCallerIdentityOutput({}, { parent: this }).accountId}/${args.invoicesProcessorQueue.name}`,
        credentials: this._role.arn,
      },
      { parent: this },
    );

    this._enqueueInvoiceResponses = new Responses(
      "EnqueueInvoice",
      {
        statusCodes: ["200", "400", "403", "500", "503"],
        restApi: args.gateway.id,
        resourceId: this._invoicesResource.id,
        httpMethod: this._enqueueInvoiceMethod.httpMethod,
      },
      { parent: this },
    );

    this._enqueueInvoiceCorsRoute = new CorsRoute(
      "EnqueueInvoice",
      {
        restApiId: args.gateway.id,
        resourceId: this._invoicesResource.id,
      },
      { parent: this },
    );

    this._cdnResource = new aws.apigateway.Resource(
      "CdnResource",
      {
        restApi: args.gateway.id,
        parentId: args.gateway.rootResourceId,
        pathPart: "cdn",
      },
      { parent: this },
    );

    this._invalidationResource = new aws.apigateway.Resource(
      "InvalidationResource",
      {
        restApi: args.gateway.id,
        parentId: this._cdnResource.id,
        pathPart: "invalidation",
      },
      { parent: this },
    );

    this._invalidationRequestValidator = new aws.apigateway.RequestValidator(
      "InvalidationRequestValidator",
      {
        restApi: args.gateway.id,
        validateRequestBody: true,
        validateRequestParameters: false,
      },
      { parent: this },
    );

    this._invalidationRequestModel = new aws.apigateway.Model(
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

    this._invalidationMethod = new aws.apigateway.Method(
      "InvalidationMethod",
      {
        restApi: args.gateway.id,
        resourceId: this._invalidationResource.id,
        httpMethod: "POST",
        authorization: "AWS_IAM",
        requestValidatorId: this._invalidationRequestValidator.id,
        requestModels: {
          "application/json": this._invalidationRequestModel.name,
        },
      },
      { parent: this },
    );

    this._invalidationIntegration = new aws.apigateway.Integration(
      "InvalidationIntegration",
      {
        restApi: args.gateway.id,
        resourceId: this._invalidationResource.id,
        httpMethod: this._invalidationMethod.httpMethod,
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
        credentials: this._role.arn,
      },
      { parent: this },
    );

    this._invalidationResponses = new Responses(
      "Invalidation",
      {
        statusCodes: ["200", "400", "403", "404", "413", "500", "503"],
        restApi: args.gateway.id,
        resourceId: this._invalidationResource.id,
        httpMethod: this._invalidationMethod.httpMethod,
      },
      { parent: this },
    );

    this._invalidationCorsRoute = new CorsRoute(
      "Invalidation",
      {
        restApiId: args.gateway.id,
        resourceId: this._invalidationResource.id,
      },
      { parent: this },
    );

    this._corsResponse4xx = new aws.apigateway.Response(
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

    this._corsResponse5xx = new aws.apigateway.Response(
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

    this._logGroup = new aws.cloudwatch.LogGroup(
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

        this._wellKnownResource,
        this._appSpecificResource,
        ...this._wellKnownAppSpecificRoutes.flatMap(({ triggers }) => triggers),

        this._parametersResource,
        this._parametersProxyResource,
        this._parametersProxyMethod,
        this._parametersProxyIntegration,
        ...this._parametersProxyResponses.triggers,
        ...this._parametersProxyCorsRoute.triggers,

        this._usersResource,
        ...this._usersSyncRoute.triggers,

        this._papercutResource,
        this._papercutProxyResource,
        this._papercutProxyMethod,
        this._papercutProxyIntegration,
        ...this._papercutProxyCorsRoute.triggers,

        this._invoicesResource,
        this._enqueueInvoiceRequestValidator,
        this._enqueueInvoiceRequestModel,
        this._enqueueInvoiceMethod,
        this._enqueueInvoiceIntegration,
        ...this._enqueueInvoiceResponses.triggers,
        ...this._enqueueInvoiceCorsRoute.triggers,

        this._cdnResource,
        this._invalidationResource,
        this._invalidationRequestValidator,
        this._invalidationRequestModel,
        this._invalidationMethod,
        this._invalidationIntegration,
        ...this._invalidationResponses.triggers,
        ...this._invalidationCorsRoute.triggers,

        this._corsResponse4xx,
        this._corsResponse5xx,
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

    this._deployment = new aws.apigateway.Deployment(
      "Deployment",
      {
        restApi: args.gateway.id,
        triggers,
      },
      { parent: this },
    );

    this._stage = new aws.apigateway.Stage(
      "Stage",
      {
        restApi: args.gateway.id,
        stageName: AppData.stage,
        deployment: this._deployment.id,
        accessLogSettings: {
          destinationArn: this._logGroup.arn,
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
      role: this._role.id,
      apiPolicy: this._apiPolicy.id,
      domainName: this._domainName.id,

      wellKnownResource: this._wellKnownResource.id,
      appSpecificResource: this._appSpecificResource.id,

      parametersResource: this._parametersResource.id,
      parametersProxyResource: this._parametersProxyResource.id,
      parametersProxyMethod: this._parametersProxyMethod.id,
      parametersProxyIntegration: this._parametersProxyIntegration.id,

      usersResource: this._usersResource.id,

      papercutResource: this._papercutResource.id,
      papercutProxyResource: this._papercutProxyResource.id,
      papercutProxyMethod: this._papercutProxyMethod.id,
      papercutProxyIntegration: this._papercutProxyIntegration.id,

      invoicesResource: this._invoicesResource.id,
      enqueueInvoiceRequestValidator: this._enqueueInvoiceRequestValidator.id,
      enqueueInvoiceRequestModel: this._enqueueInvoiceRequestModel.id,
      enqueueInvoiceMethod: this._enqueueInvoiceMethod.id,
      enqueueInvoiceIntegration: this._enqueueInvoiceIntegration.id,

      cdnResource: this._cdnResource.id,
      invalidationResource: this._invalidationResource.id,
      invalidationRequestValidator: this._invalidationRequestValidator.id,
      invalidationRequestModel: this._invalidationRequestModel.id,
      invalidationMethod: this._invalidationMethod.id,
      invalidationIntegration: this._invalidationIntegration.id,

      corsResponse4xx: this._corsResponse4xx.id,
      corsResponse5xx: this._corsResponse5xx.id,

      logGroup: this._logGroup.id,
      deployment: this._deployment.id,
      stage: this._stage.id,
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
  private _resource: aws.apigateway.Resource;
  private _method: aws.apigateway.Method;
  private _integration: aws.apigateway.Integration;
  private _methodResponse: aws.apigateway.MethodResponse;
  private _integrationResponse: aws.apigateway.IntegrationResponse;
  private _corsRoute: CorsRoute;

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

    this._resource = new aws.apigateway.Resource(
      `${name}Resource`,
      {
        restApi: args.apiId,
        parentId: args.parentId,
        pathPart: args.pathPart,
      },
      { parent: this },
    );

    this._method = new aws.apigateway.Method(
      `${name}Method`,
      {
        restApi: args.apiId,
        resourceId: this._resource.id,
        httpMethod: "GET",
        authorization: "AWS_IAM",
      },
      { parent: this },
    );

    this._integration = new aws.apigateway.Integration(
      `${name}Integration`,
      {
        restApi: args.apiId,
        resourceId: this._resource.id,
        httpMethod: this._method.httpMethod,
        type: "MOCK",
      },
      { parent: this },
    );

    this._methodResponse = new aws.apigateway.MethodResponse(
      `${name}MethodResponse`,
      {
        restApi: args.apiId,
        resourceId: this._resource.id,
        httpMethod: this._method.httpMethod,
        statusCode: "200",
      },
      { parent: this },
    );

    this._integrationResponse = new aws.apigateway.IntegrationResponse(
      `${name}IntegrationResponse`,
      {
        restApi: args.apiId,
        resourceId: this._resource.id,
        httpMethod: this._method.httpMethod,
        statusCode: this._methodResponse.statusCode,
        responseTemplates: args.responseTemplates,
      },
      { parent: this },
    );

    this._corsRoute = new CorsRoute(
      `${name}WellKnownAppSpecificRoute`,
      {
        restApiId: args.apiId,
        resourceId: this._resource.id,
      },
      { parent: this },
    );

    this.registerOutputs({
      resource: this._resource.id,
      method: this._method.id,
      integration: this._integration.id,
      methodResponse: this._methodResponse.id,
      integrationResponse: this._integrationResponse.id,
    });
  }

  get triggers() {
    return [
      this._resource,
      this._method,
      this._integration,
      ...this._corsRoute.triggers,
    ];
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
  private _resource: aws.apigateway.Resource;
  private _method: aws.apigateway.Method;
  private _integration: aws.apigateway.Integration;
  private _responses: Responses;
  private _corsRoute: CorsRoute;

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

    this._resource = new aws.apigateway.Resource(
      `${name}Resource`,
      {
        restApi: args.restApiId,
        parentId: args.parentId,
        pathPart: args.pathPart,
      },
      { parent: this },
    );

    this._method = new aws.apigateway.Method(
      `${name}Method`,
      {
        restApi: args.restApiId,
        resourceId: this._resource.id,
        httpMethod: "POST",
        authorization: "AWS_IAM",
      },
      { parent: this },
    );

    this._integration = new aws.apigateway.Integration(
      `${name}Integration`,
      {
        restApi: args.restApiId,
        resourceId: this._resource.id,
        httpMethod: this._method.httpMethod,
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
        uri: pulumi.interpolate`arn:aws:apigateway:${aws.getRegionOutput({}, { parent: this }).name}:events:path//`,
        credentials: args.executionRoleArn,
      },
      { parent: this },
    );

    this._responses = new Responses(
      name,
      {
        statusCodes: ["200", "400", "403", "500", "503"],
        restApi: args.restApiId,
        resourceId: this._resource.id,
        httpMethod: this._method.httpMethod,
      },
      { parent: this },
    );

    this._corsRoute = new CorsRoute(
      `${name}Event`,
      {
        restApiId: args.restApiId,
        resourceId: this._resource.id,
      },
      { parent: this },
    );

    this.registerOutputs({
      resource: this._resource.id,
      method: this._method.id,
      integration: this._integration.id,
    });
  }

  get triggers() {
    return [
      this._resource,
      this._method,
      this._integration,
      ...this._responses.triggers,
      ...this._corsRoute.triggers,
    ];
  }
}

interface ResponsesArgs {
  statusCodes: Array<"200" | "400" | "403" | "404" | "413" | "500" | "503">;
  restApi: aws.apigateway.RestApi["id"];
  resourceId: aws.apigateway.Resource["id"];
  httpMethod: aws.apigateway.Method["httpMethod"];
}

class Responses extends pulumi.ComponentResource {
  private _responses: Array<
    [
      ResponsesArgs["statusCodes"][number],
      {
        integration: aws.apigateway.IntegrationResponse;
        method: aws.apigateway.MethodResponse;
      },
    ]
  > = [];

  constructor(
    name: string,
    args: ResponsesArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(
      `${AppData.name}:tenant:aws:Responses`,
      `${name}Responses`,
      args,
      opts,
    );

    args.statusCodes.map((statusCode) =>
      this._responses.push([
        statusCode,
        {
          integration: new aws.apigateway.IntegrationResponse(
            `${name}IntegrationResponse${statusCode}`,
            {
              restApi: args.restApi,
              resourceId: args.resourceId,
              httpMethod: args.httpMethod,
              selectionPattern: statusCode,
              statusCode,
            },
            { parent: this },
          ),
          method: new aws.apigateway.MethodResponse(
            `${name}MethodResponse${statusCode}`,
            {
              restApi: args.restApi,
              resourceId: args.resourceId,
              httpMethod: args.httpMethod,
              statusCode,
            },
            { parent: this },
          ),
        },
      ]),
    );

    this.registerOutputs(
      this._responses.reduce(
        (outputs, [statusCode, { integration, method }]) => {
          outputs[`integrationResponse${statusCode}`] = integration.id;
          outputs[`methodResponse${statusCode}`] = method.id;

          return outputs;
        },
        {} as Record<string, pulumi.Output<string>>,
      ),
    );
  }

  get triggers() {
    return this._responses.flatMap(([, { integration, method }]) => [
      integration,
      method,
    ]);
  }
}

interface CorsRouteArgs {
  restApiId: aws.apigateway.RestApi["id"];
  resourceId: aws.apigateway.Resource["id"];
}

class CorsRoute extends pulumi.ComponentResource {
  private _method: aws.apigateway.Method;
  private _integration: aws.apigateway.Integration;
  private _integrationResponse: aws.apigateway.IntegrationResponse;
  private _methodResponse: aws.apigateway.MethodResponse;

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

    this._method = new aws.apigateway.Method(
      `${name}CorsMethod`,
      {
        restApi: args.restApiId,
        resourceId: args.resourceId,
        httpMethod: "OPTIONS",
        authorization: "NONE",
      },
      { parent: this },
    );

    this._integration = new aws.apigateway.Integration(
      `${name}CorsIntegration`,
      {
        restApi: args.restApiId,
        resourceId: args.resourceId,
        httpMethod: this._method.httpMethod,
        type: "MOCK",
        requestTemplates: {
          "application/json": JSON.stringify({ statusCode: 200 }),
        },
      },
      { parent: this },
    );

    this._integrationResponse = new aws.apigateway.IntegrationResponse(
      `${name}CorsIntegrationResponse`,
      {
        restApi: args.restApiId,
        resourceId: args.resourceId,
        httpMethod: this._method.httpMethod,
        statusCode: "204",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": "'*'",
          "method.response.header.Access-Control-Allow-Methods":
            "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
          "method.response.header.Access-Control-Allow-Origin": "'*'",
        },
      },
      { parent: this, dependsOn: [this._integration] },
    );

    this._methodResponse = new aws.apigateway.MethodResponse(
      `${name}CorsMethodResponse`,
      {
        restApi: args.restApiId,
        resourceId: args.resourceId,
        httpMethod: this._method.httpMethod,
        statusCode: this._integrationResponse.statusCode,
        responseParameters: {
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Methods": true,
          "method.response.header.Access-Control-Allow-Origin": true,
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      method: this._method.id,
      integration: this._integration.id,
      integrationResponse: this._integrationResponse.id,
      methodResponse: this._methodResponse.id,
    });
  }

  get triggers() {
    return [
      this._method,
      this._integration,
      this._integrationResponse,
      this._methodResponse,
    ];
  }
}
