import { tenantSchema } from "@paperwait/core/tenants/shared";
import { valibot as v } from "@paperwait/core/utils/libs";
import { version as awsPluginVersion } from "@pulumi/aws/package.json";
import { version as cloudflarePluginVersion } from "@pulumi/cloudflare/package.json";
import * as pulumi from "@pulumi/pulumi";

import { getProgram } from "./program";
import { resource } from "./resource";

import type { SQSBatchItemFailure, SQSHandler, SQSRecord } from "aws-lambda";

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
