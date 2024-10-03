import {
  DeleteParameterCommand,
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import {
  ParametersSecretsExtensionHttpError,
  ParametersSecretsExtensionJsonParseError,
} from "@paperwait/core/errors/aws";
import { Resource } from "sst";
import * as v from "valibot";

import type {
  DeleteParameterCommandInput,
  GetParameterCommandInput,
  GetParameterCommandOutput,
  PutParameterCommandInput,
  SSMClient,
} from "@aws-sdk/client-ssm";
import type { NanoId } from "../utils/schemas";

export { SSMClient as Client } from "@aws-sdk/client-ssm";

export const buildParameterPath = (
  tenantId: NanoId,
  ...segments: Array<string>
) => `/paperwait/tenant/${tenantId}/${segments.join("/")}`;

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

export const getParameterJsonResponseSchema = v.object({
  Parameter: v.optional(
    v.partial(
      v.object({
        ARN: v.string(),
        Name: v.string(),
        Type: v.string(),
        Value: v.string(),
        Version: v.number(),
        DataType: v.string(),
        Selector: v.string(),
        SourceResult: v.string(),
        LastModifiedDate: v.date(),
      }),
    ),
  ),
  $metadata: v.partial(
    v.object({
      cfId: v.string(),
      attempts: v.number(),
      requestId: v.string(),
      httpStatusCode: v.number(),
      totalRetryDelay: v.number(),
      extendedRequestId: v.string(),
    }),
  ),
});
export type GetParameterJsonResponse = v.InferOutput<
  typeof getParameterJsonResponseSchema
>;

export async function getParameter(
  client: SSMClient,
  input: {
    [TKey in keyof GetParameterCommandInput]: NonNullable<
      GetParameterCommandInput[TKey]
    >;
  },
) {
  if (Resource.AppData.isDev) {
    const { Parameter, $metadata } = (await client.send(
      new GetParameterCommand(input),
    )) satisfies GetParameterCommandOutput extends GetParameterJsonResponse
      ? GetParameterCommandOutput
      : never;
    if (!Parameter?.Value)
      throw new ParameterNotFound({
        message: "Parameter not found or has no value",
        $metadata,
      });

    return Parameter.Value;
  }

  const url = new URL(
    `http://localhost:${process.env.PARAMETERS_SECRETS_EXTENSION_HTTP_PORT ?? 2773}/systemsmanager/parameters/get`,
  );
  url.searchParams.set("name", input.Name);
  if (input.WithDecryption) url.searchParams.set("withDecryption", "true");

  const { sessionToken } = await client.config.credentials();
  if (!sessionToken) throw new Error("Missing session token");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-AWS-Parameters-Secrets-Token": sessionToken,
    },
  });
  if (!res.ok)
    throw new ParametersSecretsExtensionHttpError(res.statusText, res.status);

  const result = v.safeParse(getParameterJsonResponseSchema, await res.json());
  if (!result.success)
    throw new ParametersSecretsExtensionJsonParseError(result.issues);

  const { Parameter, $metadata } = result.output;
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
