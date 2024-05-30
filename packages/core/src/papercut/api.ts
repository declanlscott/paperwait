import ky, { HTTPError as kyHttpError } from "ky";
import { Resource } from "sst";

import { apiGatewaySigner } from "../aws/signature-v4";
import {
  HttpError,
  InternalServerError,
  UnauthorizedError,
} from "../errors/http";
import { validate } from "../valibot";
import {
  GetSharedAccountPropertiesOutput,
  IsUserExistsResultBody,
  ListUserSharedAccountsResultBody,
} from "../xml-rpc/schemas";

import type {
  GetSharedAccountPropertiesEvent,
  IsUserExistsEvent,
  ListUserSharedAccountsEvent,
} from "../xml-rpc/schemas";

export async function isUserExists(event: IsUserExistsEvent) {
  try {
    const responseBody = await invokeApi(
      new URL(`${Resource.PapercutApiGateway.url}/is-user-exists`),
      event,
    );

    const { output } = validate(IsUserExistsResultBody, responseBody, {
      Error: InternalServerError,
      message: "Failed to parse xml-rpc output",
    });

    if (!output) throw new UnauthorizedError("User does not exist in PaperCut");
  } catch (e) {
    throw httpError(e);
  }
}

export async function getUserSharedAccounts(
  event: ListUserSharedAccountsEvent,
) {
  try {
    const responseBody = await invokeApi(
      new URL(`${Resource.PapercutApiGateway.url}/list-user-shared-accounts`),
      event,
    );

    const { output } = validate(
      ListUserSharedAccountsResultBody,
      responseBody,
      {
        Error: InternalServerError,
        message: "Failed to parse xml-rpc output",
      },
    );

    return output;
  } catch (e) {
    throw httpError(e);
  }
}

export async function getSharedAccountProperties(
  event: GetSharedAccountPropertiesEvent,
) {
  try {
    const responseBody = await invokeApi(
      new URL(
        `${Resource.PapercutApiGateway.url}/get-shared-account-properties`,
      ),
      event,
    );

    const { output } = validate(
      GetSharedAccountPropertiesOutput,
      responseBody,
      {
        Error: InternalServerError,
        message: "Failed to parse xml-rpc output",
      },
    );

    return output;
  } catch (e) {
    throw httpError(e);
  }
}

async function invokeApi(url: URL, event: unknown) {
  const requestBody = JSON.stringify(event);

  const { headers } = await apiGatewaySigner.sign({
    hostname: url.hostname,
    protocol: url.protocol,
    method: "POST",
    path: url.pathname,
    headers: {
      host: url.hostname,
      accept: "application/json",
    },
    body: requestBody,
  });

  return await ky.post(url, { body: requestBody, headers }).json();
}

function httpError(e: unknown): HttpError {
  console.error(e);

  if (e instanceof HttpError) return e;
  if (e instanceof kyHttpError) return new InternalServerError(e.message);

  return new InternalServerError();
}
