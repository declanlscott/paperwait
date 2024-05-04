import {
  GetParameterCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

import { AWS_REGION } from "../constants";

import type {
  GetParameterCommandInput,
  PutParameterCommandInput,
} from "@aws-sdk/client-ssm";

export const ssmClient = new SSMClient({ region: AWS_REGION });

export async function putParameter(input: PutParameterCommandInput) {
  return await ssmClient.send(new PutParameterCommand(input));
}

export async function getParameter(input: GetParameterCommandInput) {
  return await ssmClient.send(new GetParameterCommand(input));
}
