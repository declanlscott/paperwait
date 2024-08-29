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

export const ssmClient = new SSMClient({
  region: AWS_REGION,
  credentials: fromNodeProviderChain(),
});

export const buildSsmParameterPath = (
  orgId: NanoId,
  ...segments: Array<string>
) => `/paperwait/org/${orgId}/${segments.join("/")}`;

export async function putSsmParameter(input: PutParameterCommandInput) {
  try {
    await ssmClient.send(new PutParameterCommand(input));
  } catch (e) {
    if (e instanceof ParameterAlreadyExists)
      throw new ConflictError("Parameter already exists");

    throw e;
  }
}

export async function getSsmParameter(input: GetParameterCommandInput) {
  try {
    const { Parameter } = await ssmClient.send(new GetParameterCommand(input));

    if (!Parameter?.Value)
      throw new NotFoundError("Parameter exists but has no value");

    return Parameter.Value;
  } catch (e) {
    if (e instanceof ParameterNotFound)
      throw new NotFoundError("Parameter not found");

    throw e;
  }
}

export async function deleteSsmParameter(input: DeleteParameterCommandInput) {
  try {
    await ssmClient.send(new DeleteParameterCommand(input));
  } catch (e) {
    if (e instanceof ParameterNotFound)
      throw new NotFoundError("Parameter not found");

    throw e;
  }
}
