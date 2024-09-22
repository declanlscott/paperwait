import { AssumeRoleCommand } from "@aws-sdk/client-sts";

import type { AssumeRoleCommandInput, STSClient } from "@aws-sdk/client-sts";

export { STSClient as Client } from "@aws-sdk/client-sts";

export const assumeRole = async (
  client: STSClient,
  input: {
    [TKey in keyof AssumeRoleCommandInput]: NonNullable<
      AssumeRoleCommandInput[TKey]
    >;
  },
) => client.send(new AssumeRoleCommand(input));
