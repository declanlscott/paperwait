from aws_lambda_powertools.utilities.data_classes import event_source, SQSEvent
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord
from mypy_boto3_sts.type_defs import CredentialsTypeDef
from pulumi import automation as auto
from sst import Resource

import boto3
import importlib.metadata
import infra
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
    workspace.install_plugin(name="cloudflare", version=f"v{importlib.metadata.version('pulumi_cloudflare')}")

    sts_client = boto3.client("sts")

    output = sts_client.assume_role(RoleArn=Resource.Cloud.aws.manageTenantInfraRoleArn,
                                    RoleSessionName="ManageTenantInfraSession")

    batch_item_failures = []
    for record in event.records:
        try:
            process_record(record, output.get("Credentials"))
        except Exception as e:
            logging.exception(e)

            batch_item_failures.append(record.message_id)

    return {"batchItemFailures": batch_item_failures}

def process_record(record: SQSRecord, credentials: CredentialsTypeDef):
    tenant_id: str = record.json_body["tenantId"]

    def program():
        infra.program(tenant_id)

    stack = auto.create_or_select_stack(
        project_name=project_name,
        stack_name=f"{Resource.Meta.app.name}-{Resource.Meta.app.stage}-tenant-{tenant_id}",
        program=program
    )

    stack.set_config(key="aws:region", value=auto.ConfigValue(value=Resource.Cloud.aws.region))
    stack.set_config(key="aws:accessKey", value=auto.ConfigValue(value=credentials.get("AccessKeyId")))
    stack.set_config(key="aws:secretKey", value=auto.ConfigValue(value=credentials.get("SecretAccessKey"),
                                                                 secret=True))
    stack.set_config(key="aws:sessionToken", value=auto.ConfigValue(value=credentials.get("SessionToken"),
                                                                    secret=True))
    stack.set_config(key="cloudflare:apiToken", value=auto.ConfigValue(value=Resource.Cloud.cloudflare.apiToken,
                                                                       secret=True))

    result = stack.up(on_event=print, on_output=print)

    if result.summary.result == "failed":
        raise Exception(result)

    requests.post(
        url=f"{Resource.Realtime.url}/party/org_{tenant_id}",
        headers={
            "x-api-key": Resource.Realtime.apiKey
        },
        data="POKE"
    )
