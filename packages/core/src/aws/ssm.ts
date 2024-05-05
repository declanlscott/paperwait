import {
  GetParameterCommand,
  ParameterAlreadyExists,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

import { AWS_REGION } from "../constants";
import { ConflictError, NotFoundError } from "../errors";

import type {
  GetParameterCommandInput,
  PutParameterCommandInput,
} from "@aws-sdk/client-ssm";

export const ssmClient = new SSMClient({ region: AWS_REGION });

export async function putParameter(input: PutParameterCommandInput) {
  try {
    return await ssmClient.send(new PutParameterCommand(input));
  } catch (e) {
    if (e instanceof ParameterAlreadyExists)
      throw new ConflictError("Parameter already exists");

    throw e;
  }
}

export async function getParameter(input: GetParameterCommandInput) {
  try {
    return await ssmClient.send(new GetParameterCommand(input));
  } catch (e) {
    if (e instanceof ParameterNotFound)
      throw new NotFoundError("Parameter not found");

    throw e;
  }
}
