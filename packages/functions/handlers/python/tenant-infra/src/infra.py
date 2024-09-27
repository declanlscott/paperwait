import json
import pulumi_aws as aws
import pulumi_cloudflare as cloudflare
import pulumi

from sst import Resource

# TODO: add dns, integrations, functions, buckets, roles, etc

def program(tenant_id: str):
    account_name = f"{Resource.Meta.app.name}-{Resource.Meta.app.stage}-tenant-{tenant_id}"
    email_segments = Resource.Cloud.aws.orgRootEmail.split("@")
    account = aws.organizations.Account(resource_name="Account",
                                        name=account_name,
                                        email=f"{email_segments[0]}+{account_name}@{email_segments[1]}",
                                        parent_id=Resource.Cloud.aws.tenantsOrganizationalUnitId,
                                        role_name="OrganizationAccountAccessRole",
                                        iam_user_access_to_billing="ALLOW")

    aws_provider = aws.provider.Provider(resource_name="AwsProvider",
                                         region=Resource.Cloud.aws.region,
                                         assume_role=aws.ProviderAssumeRoleArgs(
                                             role_arn=f"arn:aws:iam::{account.id}:role/{account.role_name}",
                                             session_name="OrganizationAccountAccessSession"
                                         ))
    aws_opts = pulumi.ResourceOptions(provider=aws_provider)

    http_api = aws.apigateway.Api(resource_name="HttpApi",
                                  name="http-api",
                                  protocol_type="HTTP",
                                  opts=aws_opts)

    log_group = aws.cloudwatch.LogGroup(resource_name="HttpApiAccessLog",
                                        name="/aws/vendedlogs/apis/http-api",
                                        retention_in_days=14,
                                        opts=aws_opts)

    aws.apigatewayv2.Stage(resource_name="Stage",
                           api_id=http_api.id,
                           auto_deploy=True,
                           name="$default",
                           access_log_settings=aws.apigatewayv2.StageAccessLogSettingsArgs(
                               destination_arn=log_group.arn,
                               format=json.dumps({
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
                               })
                           ),
                           opts=aws_opts)

    adjust_shared_account_account_balance_request_model = aws.apigatewayv2.Model(
        resource_name="AdjustSharedAccountAccountBalanceRequestModel",
        api_id=http_api.id,
        content_type="application/json",
        name="adjust-shared-account-account-balance-request",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "AdjustSharedAccountAccountBalanceRequestModel",
            "type": "object",
            "properties": {
                "sharedAccountName": {
                    "type": "string"
                },
                "adjustment": {
                    "type": "number"
                },
                "comment": {
                    "type": "string"
                }
            }
        }),
        opts=aws_opts
    )
    adjust_shared_account_account_balance_response_model = aws.apigatewayv2.Model(
        resource_name="AdjustSharedAccountAccountBalanceResponseModel",
        api_id=http_api.id,
        content_type="application/json",
        name="adjust-shared-account-account-balance-response",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "AdjustSharedAccountAccountBalanceResponseModel",
            "type": "object",
            "properties": {
                "success": {
                    "type": "boolean"
                }
            }
        }),
        opts=aws_opts
    )

    get_shared_account_properties_request_model = aws.apigatewayv2.Model(
        resource_name="GetSharedAccountPropertiesRequestModel",
        api_id=http_api.id,
        content_type="application/json",
        name="get-shared-account-properties-request",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "GetSharedAccountPropertiesRequestModel",
            "type": "object",
            "properties": {
                "sharedAccountName": {
                    "type": "string"
                },
                "properties": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                }
            }
        }),
        opts=aws_opts
    )
    get_shared_account_properties_response_model = aws.apigatewayv2.Model(
        resource_name="GetSharedAccountPropertiesResponseModel",
        api_id=http_api.id,
        content_type="application/json",
        name="get-shared-account-properties-response",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "GetSharedAccountPropertiesResponseModel",
            "type": "object",
            "properties": {
                "properties": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                }
            }
        }),
        opts=aws_opts
    )

    is_user_exists_request_model = aws.apigatewayv2.Model(
        resource_name="IsUserExistsRequestModel",
        api_id=http_api.id,
        content_type="application/json",
        name="is-user-exists-request",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "IsUserExistsRequestModel",
            "type": "object",
            "properties": {
                "username": {
                    "type": "string",
                }
            }
        }),
        opts=aws_opts
    )
    is_user_exists_response_model = aws.apigatewayv2.Model(
        resource_name="IsUserExistsResponseModel",
        api_id=http_api.id,
        content_type="application/json",
        name="is-user-exists-response",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "IsUserExistsResponseModel",
            "type": "object",
            "properties": {
                "exists": {
                    "type": "boolean",
                }
            }
        }),
        opts=aws_opts
    )

    list_shared_accounts_request_model = aws.apigatewayv2.Model(
        resource_name="ListSharedAccountsRequestModel",
        api_id=http_api.id,
        content_type="application/json",
        name="list-shared-accounts-request",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "ListSharedAccountsRequestModel",
            "type": "object",
            "properties": {
                "offset": {
                    "type": "integer",
                },
                "limit": {
                    "type": "integer",
                }
            }
        }),
        opts=aws_opts
    )
    list_shared_accounts_response_model = aws.apigatewayv2.Model(
        resource_name="ListSharedAccountsResponseModel",
        api_id=http_api.id,
        content_type="application/json",
        name="list-shared-accounts-response",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "ListSharedAccountsResponseModel",
            "type": "object",
            "properties": {
                "sharedAccounts": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                }
            }
        }),
        opts=aws_opts
    )

    list_user_shared_accounts_request_model = aws.apigatewayv2.Model(
        resource_name="ListUserSharedAccountsRequestModel",
        api_id=http_api.id,
        content_type="application/json",
        name="list-user-shared-accounts-request",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "ListUserSharedAccountsRequestModel",
            "type": "object",
            "properties": {
                "username": {
                    "type": "string",
                },
                "offset": {
                    "type": "integer",
                },
                "limit": {
                    "type": "integer",
                },
                "ignoreUserAccountSelectionConfig": {
                    "type": "boolean",
                }
            }
        }),
        opts=aws_opts
    )
    list_user_shared_accounts_response_model = aws.apigatewayv2.Model(
        resource_name="ListUserSharedAccountsResponseModel",
        api_id=http_api.id,
        content_type="application/json",
        name="list-user-shared-accounts-response",
        schema=json.dumps({
            "$schema": "http://json-schema.org/draft-04/schema#",
            "title": "ListUserSharedAccountsResponseModel",
            "type": "object",
            "properties": {
                "userSharedAccounts": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                }
            }
        }),
        opts=aws_opts
    )

    secure_bridge_error_response_model = aws.apigatewayv2.Model(
        resource_name="SecureBridgeErrorResponseModel",
        api_id=http_api.id,
        content_type="application/json",
        name="secure-bridge-error-response",
        schema=json.dumps({
            "schema": "http://json-schema.org/draft-04/schema#",
            "title": "SecureBridgeErrorResponseModel",
            "type": "object",
            "properties": {
                "message": {
                    "type": "string"
                }
            }
        })
    )
