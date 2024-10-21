import {
  DeleteParameterCommand,
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { Resource } from "sst";

import type {
  DeleteParameterCommandInput,
  GetParameterCommandInput,
  PutParameterCommandInput,
} from "@aws-sdk/client-ssm";

export namespace Ssm {
  export const Client = SSMClient;
  export type Client = SSMClient;

  export const buildParameterPath = (...segments: Array<string>) =>
    `/${[Resource.AppData.name, Resource.AppData.stage, ...segments].join("/")}`;

  export async function putParameter(
    client: SSMClient,
    input: {
      [TKey in keyof PutParameterCommandInput]: NonNullable<
        PutParameterCommandInput[TKey]
      >;
    },
  ) {
    await client.send(new PutParameterCommand(input));
  }

  export async function getParameter(
    client: SSMClient,
    input: {
      [TKey in keyof GetParameterCommandInput]: NonNullable<
        GetParameterCommandInput[TKey]
      >;
    },
  ) {
    const { Parameter, $metadata } = await client.send(
      new GetParameterCommand(input),
    );
    if (!Parameter?.Value)
      throw new ParameterNotFound({
        message: "Parameter not found or has no value",
        $metadata,
      });

    return Parameter.Value;
  }

  export async function deleteParameter(
    client: SSMClient,
    input: {
      [TKey in keyof DeleteParameterCommandInput]: NonNullable<
        DeleteParameterCommandInput[TKey]
      >;
    },
  ) {
    await client.send(new DeleteParameterCommand(input));
  }
}
