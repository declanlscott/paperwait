import {
  DeleteParameterCommand,
  GetParameterCommand,
  ParameterAlreadyExists,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

import { AWS_REGION } from "../constants";
import { ConflictError, NotFoundError } from "../errors/http";

import type {
  DeleteParameterCommandInput,
  GetParameterCommandInput,
  PutParameterCommandInput,
} from "@aws-sdk/client-ssm";
import type { NanoId } from "../utils/schemas";

export const client = new SSMClient({
  region: AWS_REGION,
  credentials: fromNodeProviderChain(),
});

export const buildParameterPath = (orgId: NanoId, ...segments: Array<string>) =>
  `/paperwait/org/${orgId}/${segments.join("/")}`;

export async function putParameter(input: PutParameterCommandInput) {
  try {
    await client.send(new PutParameterCommand(input));
  } catch (e) {
    if (e instanceof ParameterAlreadyExists)
      throw new ConflictError("Parameter already exists");

    throw e;
  }
}

export async function getParameter(input: GetParameterCommandInput) {
  try {
    const { Parameter } = await client.send(new GetParameterCommand(input));

    if (!Parameter?.Value)
      throw new NotFoundError("Parameter exists but has no value");

    return Parameter.Value;
  } catch (e) {
    if (e instanceof ParameterNotFound)
      throw new NotFoundError("Parameter not found");

    throw e;
  }
}

export async function deleteParameter(input: DeleteParameterCommandInput) {
  try {
    await client.send(new DeleteParameterCommand(input));
  } catch (e) {
    if (e instanceof ParameterNotFound)
      throw new NotFoundError("Parameter not found");

    throw e;
  }
}
