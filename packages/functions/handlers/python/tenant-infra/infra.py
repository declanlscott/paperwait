import json

from sst import Resource

import pulumi_aws as aws
import pulumi

def program(tenant_id: str):
    account_name = f"{Resource.Meta.app.name}-{Resource.Meta.app.stage}-tenant-{tenant_id}"
    email_segments = Resource.Aws.orgRootEmail.split("@")
    account = aws.organizations.Account(resource_name="Account",
                                    name=account_name,
                                    email=f"{email_segments[0]}+{account_name}@{email_segments[1]}",
                                    parent_id=Resource.Aws.tenantsOrganizationalUnitId,
                                    role_name="OrganizationAccountAccessRole")

    provider = aws.provider.Provider(resource_name="AwsProvider",
                                     region=Resource.Aws.region,
                                     assume_role=aws.ProviderAssumeRoleArgs(
                                         role_arn=f"arn:aws:iam::{account.id}:role/{account.role_name}",
                                         session_name="OrganizationAccountAccessSession"
                                     ))
    opts = pulumi.ResourceOptions(provider=provider)

    api_gateway = aws.apigateway.Api(resource_name="ApiGateway",
                                     name="http-api",
                                     protocol_type="HTTP",
                                     opts=opts)

    log_group = aws.cloudwatch.LogGroup(resource_name="HttpApiAccessLog",
                                        name="/aws/vendedlogs/apis/http-api",
                                        retention_in_days=14,
                                        opts=opts)

    aws.apigatewayv2.Stage(resource_name="Stage",
                                   api_id=api_gateway.id,
                                   auto_deploy=True,
                                   name="$default",
                                   access_log_settings=aws.apigatewayv2.StageAccessLogSettingsArgs(
                                       destination_arn=log_group.arn,
                                       format=json.dumps(
                                           {
                                               # request info
                                               "requestTime": '"$context.requestTime"',
                                               "requestId": '"$context.requestId"',
                                               "httpMethod": '"$context.httpMethod"',
                                               "path": '"$context.path"',
                                               "routeKey": '"$context.routeKey"',
                                               "status": "$context.status",
                                               "responseLatency": "$context.responseLatency",
                                                # integration info
                                               "integrationRequestId": '"$context.integration.requestId"',
                                               "integrationStatus": '"$context.integration.status"',
                                               "integrationLatency": '"$context.integration.latency"',
                                               "integrationServiceStatus": '"$context.integration.serviceStatus"',
                                               # caller info
                                               "ip": '"$context.identity.sourceIp"',
                                               "userAgent": '"$context.identity.userAgent"'
                                           }
                                       )
                                   ),
                                   opts=opts)

    # TODO: add dns, models, integrations, functions, buckets, etc
