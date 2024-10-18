import { tenantSchema } from "@paperwait/core/tenants/shared";
import { version as awsPluginVersion } from "@pulumi/aws/package.json";
import { version as cloudflarePluginVersion } from "@pulumi/cloudflare/package.json";
import * as pulumi from "@pulumi/pulumi";
import { version as tlsPluginVersion } from "@pulumi/tls/package.json";
import * as v from "valibot";

import { getProgram } from "./program";
import { useResource, withResource } from "./resource";

import type { SQSBatchItemFailure, SQSHandler, SQSRecord } from "aws-lambda";

export const handler: SQSHandler = async (event) =>
  withResource(async () => {
    const batchItemFailures: Array<SQSBatchItemFailure> = [];

    for (const record of event.Records) {
      try {
        await processRecord(record);
      } catch (e) {
        console.error("Failed to process record: ", record, e);

        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    return { batchItemFailures };
  });

async function processRecord(record: SQSRecord) {
  const { tenantId } = v.parse(
    v.object({
      tenantId: tenantSchema.entries.id,
    }),
    record.body,
  );

  const { AppData, Cloud, PulumiBucket } = useResource();

  const projectName = `${AppData.name}-${AppData.stage}-tenants`;
  const stack = await pulumi.automation.LocalWorkspace.createOrSelectStack(
    {
      projectName,
      stackName: `${AppData.name}-${AppData.stage}-tenant-${tenantId}`,
      program: getProgram(tenantId),
    },
    {
      projectSettings: {
        name: projectName,
        runtime: "nodejs",
        backend: {
          url: `s3://${PulumiBucket.name}/${projectName}`,
        },
      },
      pulumiHome: "/tmp/pulumi_home",
    },
  );
  console.log("Successfully initialized stack");

  console.log("Installing plugins...");
  await Promise.all([
    stack.workspace.installPlugin("aws", `v${awsPluginVersion}`),
    stack.workspace.installPlugin("cloudflare", `v${cloudflarePluginVersion}`),
    stack.workspace.installPlugin("tls", `v${tlsPluginVersion}`),
  ]);
  console.log("Successfully installed plugins");

  console.log("Setting stack configuration...");
  await stack.setAllConfig({
    "aws:region": { value: Cloud.aws.region },
    "aws:assumeRole": { value: Cloud.aws.organization.managementRole.arn },
    "cloudflare:apiToken": {
      value: Cloud.cloudflare.apiToken,
      secret: true,
    },
  });
  console.log("Successfully set stack configuration");

  console.log("Updating stack...");
  const result = await stack.up({
    onEvent: console.log,
    onOutput: console.log,
  });
  console.log("Update summary: ", result.summary.resourceChanges);

  if (result.summary.result === "failed") {
    const error = new Error(result.summary.message);

    console.error("Failed to update stack: ", error.message);

    throw error;
  }
}
