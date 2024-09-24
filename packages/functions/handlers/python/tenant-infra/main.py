from aws_lambda_powertools.utilities.data_classes import event_source, SQSEvent
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord
from mypy_boto3_sts.type_defs import CredentialsTypeDef
from pulumi import automation as auto
from sst import Resource

import boto3
import importlib.metadata
import logging
import requests

project_name = f"{Resource.Meta.app.name}-{Resource.Meta.app.stage}-tenants"

@event_source(data_class=SQSEvent)
def handler(event: SQSEvent):
    workspace = auto.LocalWorkspace(
        project_settings=auto.ProjectSettings(name=project_name,
                                              runtime="python",
                                              backend=auto.ProjectBackend(
                                                  url=f"s3://{Resource.Storage.pulumiBackend.bucket}"
                                              ))
    )

    workspace.install_plugin(name="aws", version=f"v{importlib.metadata.version('pulumi_aws')}")

    sts_client = boto3.client("sts")

    output = sts_client.assume_role(RoleArn=Resource.Aws.manageTenantInfraRoleArn,
                                    RoleSessionName="ManageTenantInfraSession")

    batch_item_failures = []
    for record in event.records:
        try:
            process_record(record, output.get("Credentials"))
        except Exception as e:
            logging.exception(e)

            batch_item_failures.append(record.message_id)

    return {'batchItemFailures': batch_item_failures}

# TODO: pulumi program for creating tenant aws account
# TODO: assume role in tenant account
# TODO: pulumi program for infra in tenant's account

def process_record(record: SQSRecord, credentials: CredentialsTypeDef):
    tenant_id = record.json_body["orgId"]

    stack = auto.create_or_select_stack(
        project_name=project_name,
        stack_name=f"{Resource.Meta.app.name}-{Resource.Meta.app.stage}-tenant-{tenant_id}"
    )

    stack.set_config(key="aws:region", value=auto.ConfigValue(value=Resource.Aws.region))
    stack.set_config(key="aws:accessKey", value=auto.ConfigValue(value=credentials.get("AccessKeyId")))
    stack.set_config(key="aws:secretKey", value=auto.ConfigValue(value=credentials.get("SecretAccessKey")))
    stack.set_config(key="aws:sessionToken", value=auto.ConfigValue(value=credentials.get("SessionToken")))

    result = stack.up(on_output=print)

    if result.summary.result == "failed":
        raise Exception(result)

    requests.post(
        url=f"{Resource.Realtime.url}/party/{tenant_id}",
        headers={
            "x-api-key": Resource.Realtime.apiKey
        },
        data="POKE"
    )
