import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

import type { AssumeRoleCommandInput, Credentials } from "@aws-sdk/client-sts";

export namespace Sts {
  export const Client = STSClient;

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
}
