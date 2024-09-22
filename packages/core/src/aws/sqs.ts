import { SendMessageCommand } from "@aws-sdk/client-sqs";

import type { SendMessageCommandInput, SQSClient } from "@aws-sdk/client-sqs";

export { SQSClient as Client } from "@aws-sdk/client-sqs";

export async function sendMessage(
  client: SQSClient,
  input: {
    [TKey in keyof SendMessageCommandInput]: NonNullable<
      SendMessageCommandInput[TKey]
    >;
  },
) {
  await client.send(new SendMessageCommand(input));
}
