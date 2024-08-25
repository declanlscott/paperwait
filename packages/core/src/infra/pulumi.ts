import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { physicalName } from "./helpers";

import type { Organization } from "../organization/sql";

export async function program(orgId: Organization["id"]) {
  const apiName = `Tenant-${orgId}-Api`;

  const api = new aws.apigatewayv2.Api(apiName, {
    protocolType: "HTTP",
    corsConfiguration: {
      allowHeaders: ["*"],
      allowMethods: ["*"],
      allowOrigins: ["*"],
    },
  });

  const logGroup = new aws.cloudwatch.LogGroup(`${apiName}AccessLog`, {
    name: `aws/vendedlogs/apis/${physicalName(64, apiName)}`,
    retentionInDays: 30,
  });

  new aws.apigatewayv2.Stage(`${apiName}Stage`, {
    apiId: api.id,
    autoDeploy: true,
    name: "$default",
    accessLogSettings: {
      destinationArn: logGroup.arn,
      format: JSON.stringify({
        // request info
        requestTime: `"$context.requestTime"`,
        requestId: `"$context.requestId"`,
        httpMethod: `"$context.httpMethod"`,
        path: `"$context.path"`,
        routeKey: `"$context.routeKey"`,
        status: `$context.status`, // integer value, do not wrap in quotes
        responseLatency: `$context.responseLatency`, // integer value, do not wrap in quotes
        // integration info
        integrationRequestId: `"$context.integration.requestId"`,
        integrationStatus: `"$context.integration.status"`,
        integrationLatency: `"$context.integration.latency"`,
        integrationServiceStatus: `"$context.integration.integrationStatus"`,
        // caller info
        ip: `"$context.identity.sourceIp"`,
        userAgent: `"$context.identity.userAgent"`,
      }),
    },
  });

  const secureXmlRpcForwarderIntegration = new aws.apigatewayv2.Integration(
    `${apiName}SecureXmlRpcForwarderIntegration`,
    {
      apiId: api.id,
      integrationType: "AWS_PROXY",
      integrationUri: "TODO",
      payloadFormatVersion: "2.0",
    },
  );

  new aws.apigatewayv2.Route(`${apiName}SecureXmlRpcForwarderRoute`, {
    apiId: api.id,
    routeKey: "POST /secure-xml-rpc-forwarder",
    target: pulumi.interpolate`integrations/${secureXmlRpcForwarderIntegration.id}`,
  });
}
