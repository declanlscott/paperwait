import * as Credentials from "@paperwait/core/aws/credentials";
import * as Sts from "@paperwait/core/aws/sts";
import { POKE } from "@paperwait/core/constants";
import { organizationSchema } from "@paperwait/core/organizations/shared";
import * as Pulumi from "@paperwait/core/pulumi";
import { getProgram } from "@paperwait/core/pulumi/aws-account";
import { Resource } from "sst";
import * as v from "valibot";

import type { SQSBatchItemFailure, SQSHandler, SQSRecord } from "aws-lambda";

const projectName = `${Resource.Meta.app.name}-${Resource.Meta.app.stage}-tenants`;

export const handler: SQSHandler = async (event) => {
  const workspace = await Pulumi.Automation.LocalWorkspace.create({
    projectSettings: {
      name: projectName,
      runtime: "nodejs",
      backend: {
        url: `s3://${Resource.Storage.pulumiBackend.bucket}`,
      },
    },
  });

  await workspace.installPlugin("aws", `v${Pulumi.awsPluginVersion}`);

  const stsClient = new Sts.Client({
    region: Resource.Meta.awsRegion,
    credentials: Credentials.fromNodeProviderChain(),
  });

  const output = await Sts.assumeRole(stsClient, {
    RoleArn: Resource.Meta.createTenantAccountRoleArn,
    RoleSessionName: "CreateTenantAccountSession",
  });
  if (
    !output.Credentials ||
    Object.values(output.Credentials).some((value) => !value)
  )
    throw new Error("Missing credentials");

  const batchItemFailures: Array<SQSBatchItemFailure> = [];
  for (const record of event.Records) {
    try {
      await processRecord(
        record,
        output.Credentials as Sts.NonNullableCredentials,
      );
    } catch {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

async function processRecord(
  record: SQSRecord,
  credentials: Sts.NonNullableCredentials,
) {
  const { id: tenantId } = v.parse(
    v.pick(organizationSchema, ["id"]),
    record.body,
  );

  const stack = await Pulumi.Automation.LocalWorkspace.createStack({
    projectName,
    stackName: `${Resource.Meta.app.name}-${Resource.Meta.app.stage}-tenant-${tenantId}-aws-account`,
    program: getProgram(tenantId),
  });

  await Promise.all(
    [
      ["aws:region", Resource.Meta.awsRegion],
      ["aws:accessKey", credentials.AccessKeyId],
      ["aws:secretKey", credentials.SecretAccessKey],
      ["aws:sessionToken", credentials.SessionToken],
    ].map(async ([key, value]) => stack.setConfig(key, { value })),
  );

  const result = await Pulumi.up(stack);

  if (result.summary.result === "failed") {
    console.error("Pulumi up failed:", result);

    throw new Error(result.summary.message);
  }

  await fetch(`${Resource.Realtime.url}/party/${tenantId}`, {
    method: "POST",
    headers: { "x-api-key": Resource.Realtime.apiKey },
    body: POKE,
  });
}
