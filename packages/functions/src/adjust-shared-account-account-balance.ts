import { BadRequestError, InternalServerError } from "@paperwait/core/errors";
import { parseSchema } from "@paperwait/core/valibot";
import {
  AdjustSharedAccountAccountBalanceEventRecord,
  AdjustSharedAccountAccountBalanceOutput,
  buildClient,
  xmlRpcMethod,
} from "@paperwait/core/xml-rpc";

import type { SQSHandler, SQSRecord } from "aws-lambda";

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) await processRecord(record);
  console.log("Processed all records");
};

async function processRecord(record: SQSRecord) {
  try {
    console.log("Processing record", record);
    const message = JSON.parse(record.body) as unknown;

    const { orgId, input } = parseSchema(
      AdjustSharedAccountAccountBalanceEventRecord,
      message,
      {
        Error: BadRequestError,
        message: "Failed to parse message",
      },
    );

    const { client, authToken } = await buildClient(orgId);

    const value = await client.methodCall(
      xmlRpcMethod.adjustSharedAccountAccountBalance,
      [authToken, ...Object.values(input)],
    );

    const output = parseSchema(AdjustSharedAccountAccountBalanceOutput, value, {
      Error: InternalServerError,
      message: "Failed to parse xml-rpc output",
    });

    if (!output)
      throw new InternalServerError("Failed to adjust account balance");
  } catch (e) {
    console.error("Failed to process record", record, e);

    throw e;
  }
}
