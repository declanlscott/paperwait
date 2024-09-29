import { organizationSchema } from "@paperwait/core/organizations/shared";
import { parseResource } from "@paperwait/core/utils/helpers";
import { valibot as v } from "@paperwait/core/utils/libs";
import * as aws from "@pulumi/aws";
import { version as awsPluginVersion } from "@pulumi/aws/package.json";
import { version as cloudflarePluginVersion } from "@pulumi/cloudflare/package.json";
import * as pulumi from "@pulumi/pulumi";

import type { Organization } from "@paperwait/core/organizations/sql";
import type { SQSBatchItemFailure, SQSHandler, SQSRecord } from "aws-lambda";
import type { Resource } from "sst";

const resource = parseResource<{
  [TKey in keyof Pick<
    Resource,
    "PulumiBackendBucket" | "Meta" | "Cloud" | "Realtime"
  >]: Omit<Resource[TKey], "type">;
}>("CUSTOM_RESOURCE_");

const projectName = `${resource.Meta.app.name}-${resource.Meta.app.stage}-tenants`;

export const handler: SQSHandler = async (event) => {
  const workspace = await pulumi.automation.LocalWorkspace.create({
    projectSettings: {
      name: projectName,
      runtime: "nodejs",
      backend: {
        url: `s3://${resource.PulumiBackendBucket.name}`,
      },
    },
  });

  await workspace.installPlugin("aws", `v${awsPluginVersion}`);
  await workspace.installPlugin("cloudflare", `v${cloudflarePluginVersion}`);

  const batchItemFailures: Array<SQSBatchItemFailure> = [];
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

async function processRecord(record: SQSRecord) {
  const { tenantId } = v.parse(
    v.object({ tenantId: organizationSchema.entries.id }),
    record.body,
  );

  const stack = await pulumi.automation.LocalWorkspace.createOrSelectStack({
    projectName,
    stackName: `${resource.Meta.app.name}-${resource.Meta.app.stage}-tenant-${tenantId}`,
    program: getProgram(tenantId),
  });

  await stack.setAllConfig({
    "aws:region": { value: resource.Cloud.aws.region },
    "aws:assumeRole": { value: resource.Cloud.aws.manageTenantInfraRoleArn },
    "cloudflare:apiToken": {
      value: resource.Cloud.cloudflare.apiToken,
      secret: true,
    },
  });

  const result = await stack.up();

  if (result.summary.result === "failed") {
    console.error("Pulumi up failed: ", result);

    throw new Error(result.summary.message);
  }
}

// TODO: add dns, integrations, functions, buckets, roles, etc

const getProgram = (tenantId: Organization["id"]) => async () => {
  const accountName = `${resource.Meta.app.name}-${resource.Meta.app.stage}-tenant-${tenantId}`;
  const emailSegments = resource.Cloud.aws.orgRootEmail.split("@");
  const account = new aws.organizations.Account("Account", {
    name: accountName,
    email: `${emailSegments[0]}+${accountName}@${emailSegments[1]}`,
    parentId: resource.Cloud.aws.tenantsOrganizationalUnitId,
    roleName: "OrganizationAccountAccessRole",
    iamUserAccessToBilling: "ALLOW",
  });

  const awsOpts = {
    provider: new aws.Provider("AwsProvider", {
      region: resource.Cloud.aws.region as aws.Region,
      assumeRole: {
        roleArn: pulumi
          .all([account.id, account.roleName])
          .apply(
            ([accountId, roleName]) =>
              `arn:aws:iam::${accountId}:role/${roleName}`,
          ),
      },
    }),
  } satisfies pulumi.CustomResourceOptions;

  const httpApi = new aws.apigatewayv2.Api(
    "HttpApi",
    {
      name: "http-api",
      protocolType: "HTTP",
    },
    awsOpts,
  );

  const httpApiLogGroup = new aws.cloudwatch.LogGroup(
    "HttpApiAccessLog",
    {
      name: httpApi.name.apply((name) => `/aws/vendedlogs/apis/${name}`),
      retentionInDays: 14,
    },
    awsOpts,
  );

  new aws.apigatewayv2.Stage(
    "HttpApiStage",
    {
      apiId: httpApi.id,
      autoDeploy: true,
      name: "$default",
      accessLogSettings: {
        destinationArn: httpApiLogGroup.arn,
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
    },
    awsOpts,
  );

  const adjustSharedAccountAccountBalanceModels = {
    request: new aws.apigatewayv2.Model(
      "AdjustSharedAccountAccountBalanceRequestModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "AdjustSharedAccountAccountBalanceRequest",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "AdjustSharedAccountAccountBalanceRequestModel",
          type: "object",
          properties: {
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
        }),
      },
      awsOpts,
    ),
    response: new aws.apigatewayv2.Model(
      "AdjustSharedAccountAccountBalanceResponseModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "AdjustSharedAccountAccountBalanceResponse",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "AdjustSharedAccountAccountBalanceResponseModel",
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
          },
        }),
      },
      awsOpts,
    ),
  };

  const getSharedAccountPropertiesModels = {
    request: new aws.apigatewayv2.Model(
      "GetSharedAccountPropertiesRequestModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "GetSharedAccountPropertiesRequest",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "GetSharedAccountPropertiesRequestModel",
          type: "object",
          properties: {
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
        }),
      },
      awsOpts,
    ),
    response: new aws.apigatewayv2.Model(
      "GetSharedAccountPropertiesResponseModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "GetSharedAccountPropertiesResponse",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "GetSharedAccountPropertiesResponseModel",
          type: "object",
          properties: {
            properties: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        }),
      },
      awsOpts,
    ),
  };

  const isUserExistsModels = {
    request: new aws.apigatewayv2.Model(
      "IsUserExistsRequestModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "IsUserExistsRequest",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "IsUserExistsRequestModel",
          type: "object",
          properties: {
            username: {
              type: "string",
            },
          },
        }),
      },
      awsOpts,
    ),
    response: new aws.apigatewayv2.Model(
      "IsUserExistsResponseModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "IsUserExistsResponse",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "IsUserExistsResponseModel",
          type: "object",
          properties: {
            exists: {
              type: "boolean",
            },
          },
        }),
      },
      awsOpts,
    ),
  };

  const listSharedAccountsModels = {
    request: new aws.apigatewayv2.Model(
      "ListSharedAccountsRequestModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "ListSharedAccountsRequest",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "ListSharedAccountsRequestModel",
          type: "object",
          properties: {
            offset: {
              type: "integer",
            },
            limit: {
              type: "integer",
            },
          },
        }),
      },
      awsOpts,
    ),
    response: new aws.apigatewayv2.Model(
      "ListSharedAccountsResponseModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "ListSharedAccountsResponse",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "ListSharedAccountsResponseModel",
          type: "object",
          properties: {
            sharedAccounts: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        }),
      },
      awsOpts,
    ),
  };

  const listUserSharedAccountsModels = {
    request: new aws.apigatewayv2.Model(
      "ListUserSharedAccountsRequestModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "ListUserSharedAccountsRequest",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "ListUserSharedAccountsRequestModel",
          type: "object",
          properties: {
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
        }),
      },
      awsOpts,
    ),
    response: new aws.apigatewayv2.Model(
      "ListUserSharedAccountsResponseModel",
      {
        apiId: httpApi.id,
        contentType: "application/json",
        name: "ListUserSharedAccountsResponse",
        schema: JSON.stringify({
          $schema: "http://json-schema.org/draft-04/schema#",
          title: "ListUserSharedAccountsResponseModel",
          type: "object",
          properties: {
            userSharedAccounts: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        }),
      },
      awsOpts,
    ),
  };

  const secureBridgeErrorModel = new aws.apigatewayv2.Model(
    "SecureBridgeErrorModel",
    {
      apiId: httpApi.id,
      contentType: "application/json",
      name: "SecureBridgeError",
      schema: JSON.stringify({
        schema: "http://json-schema.org/draft-04/schema#",
        title: "SecureBridgeErrorResponseModel",
        type: "object",
        properties: {
          message: {
            type: "string",
          },
        },
      }),
    },
  );
};
