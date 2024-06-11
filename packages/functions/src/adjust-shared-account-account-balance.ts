import { xmlRpcMethod } from "@paperwait/core/constants";
import { BadRequestError, InternalServerError } from "@paperwait/core/errors";
import { validate } from "@paperwait/core/valibot";
import {
  AdjustSharedAccountAccountBalanceEventRecord,
  AdjustSharedAccountAccountBalanceOutput,
  buildClient,
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

    const { orgId, input } = validate(
      AdjustSharedAccountAccountBalanceEventRecord,
      {
        Error: BadRequestError,
        message: "Failed to parse message",
      },
    )(message);

    const { client, authToken } = await buildClient(orgId);

    const value = await client.methodCall(
      xmlRpcMethod.adjustSharedAccountAccountBalance,
      [authToken, ...Object.values(input)],
    );

    const output = validate(AdjustSharedAccountAccountBalanceOutput, {
      Error: InternalServerError,
      message: "Failed to parse xml-rpc output",
    })(value);

    if (!output)
      throw new InternalServerError("Failed to adjust account balance");
  } catch (e) {
    console.error("Failed to process record", record, e);

    throw e;
  }
}
