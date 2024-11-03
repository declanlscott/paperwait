import { Sqs } from "@paperwait/core/utils/aws";
import { Resource } from "sst";
import * as v from "valibot";

import type { EventBridgeHandler, SQSEvent, SQSRecord } from "aws-lambda";

// TODO: Finish implementing orders processor

export const handler: EventBridgeHandler<
  "InvoicesProcessor",
  string,
  void
> = async (event) => {
  const { Records } = JSON.parse(event.detail) as SQSEvent;

  const failures: Array<SQSRecord> = [];

  for (const record of Records)
    try {
      await processRecord(record);
    } catch (e) {
      console.error("Failed to process record: ", record, e);

      failures.push(record);
    }

  if (failures.length === Records.length)
    throw new Error("Failed to process all records");

  try {
    const sqs = new Sqs.Client();
    for (const failure of failures)
      await Sqs.sendMessage(sqs, {
        QueueUrl: Resource.InvoicesProcessorDeadLetterQueue.url,
        MessageBody: JSON.stringify(failure),
      });
  } catch (e) {
    console.error(
      "Failed to send invoices processor failures to dead letter queue: ",
      e,
    );
  }
};

async function processRecord(record: SQSRecord) {
  const { tenantId, orderId } = v.parse(
    v.object({ orderId: v.string(), tenantId: v.string() }),
    record.body,
  );
}
