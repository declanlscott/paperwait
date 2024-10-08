import { tenantSchema } from "@paperwait/core/tenants/shared";
import { valibot as v } from "@paperwait/core/utils/libs";
import { version as awsPluginVersion } from "@pulumi/aws/package.json";
import { version as cloudflarePluginVersion } from "@pulumi/cloudflare/package.json";
import * as pulumi from "@pulumi/pulumi";
import { version as tlsPluginVersion } from "@pulumi/tls/package.json";

import { getProgram } from "./program";
import { resource } from "./resource";

import type { SQSBatchItemFailure, SQSHandler, SQSRecord } from "aws-lambda";

const projectName = `${resource.AppData.name}-${resource.AppData.stage}-tenants`;

export const handler: SQSHandler = async (event) => {
  const workspace = await pulumi.automation.LocalWorkspace.create({
    projectSettings: {
      name: projectName,
      runtime: "nodejs",
      backend: {
        url: `s3://${resource.PulumiBackendBucket.name}/${projectName}`,
      },
    },
  });

  await Promise.all([
    workspace.installPlugin("aws", `v${awsPluginVersion}`),
    workspace.installPlugin("cloudflare", `v${cloudflarePluginVersion}`),
    workspace.installPlugin("tls", `v${tlsPluginVersion}`),
  ]);

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
};

async function processRecord(record: SQSRecord) {
  const { tenantId } = v.parse(
    v.object({ tenantId: tenantSchema.entries.id }),
    record.body,
  );

  const stack = await pulumi.automation.LocalWorkspace.createOrSelectStack({
    projectName,
    stackName: `${resource.AppData.name}-${resource.AppData.stage}-tenant-${tenantId}`,
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

  const result = await stack.up({
    onEvent: console.log,
    onOutput: console.log,
  });

  if (result.summary.result === "failed") {
    console.error("Pulumi up failed: ", result);

    throw new Error(result.summary.message);
  }
}
