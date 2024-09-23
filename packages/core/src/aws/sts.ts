import { AssumeRoleCommand } from "@aws-sdk/client-sts";

import type {
  AssumeRoleCommandInput,
  Credentials,
  STSClient,
} from "@aws-sdk/client-sts";

export { STSClient as Client } from "@aws-sdk/client-sts";

export type NonNullableCredentials = {
  [TKey in keyof Credentials]: NonNullable<Credentials[TKey]>;
};

export const assumeRole = async (
  client: STSClient,
  input: {
    [TKey in keyof AssumeRoleCommandInput]: NonNullable<
      AssumeRoleCommandInput[TKey]
    >;
  },
) => client.send(new AssumeRoleCommand(input));
