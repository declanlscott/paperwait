import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

import type { SendMessageCommandInput } from "@aws-sdk/client-sqs";

export namespace Sqs {
  export const Client = SQSClient;
  export type Client = SQSClient;

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
}
