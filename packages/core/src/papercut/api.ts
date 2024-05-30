import ky, { HTTPError as kyHttpError } from "ky";
import { Resource } from "sst";

import { apiGatewaySigner } from "../aws/signature-v4";
import { HttpError, InternalServerError } from "../errors/http";
import { validate } from "../valibot";
import {
  GetSharedAccountPropertiesResult,
  IsUserExistsResult,
  ListSharedAccountsResult,
  ListUserSharedAccountsResult,
} from "../xml-rpc/schemas";

import type {
  GetSharedAccountPropertiesEvent,
  IsUserExistsEvent,
  ListSharedAccountsEvent,
  ListSharedAccountsOutput,
  ListUserSharedAccountsEvent,
  ListUserSharedAccountsOutput,
} from "../xml-rpc/schemas";

export async function isUserExists(event: IsUserExistsEvent) {
  try {
    const result = await invokeApi(
      new URL(`${Resource.PapercutApiGateway.url}/is-user-exists`),
      event,
    );

    const { output } = validate(IsUserExistsResult, result, {
      Error: InternalServerError,
      message: "Failed to parse xml-rpc output",
    });

    return output;
  } catch (e) {
    throw httpError(e);
  }
}

export async function listSharedAccounts(event: ListSharedAccountsEvent) {
  async function invokeAndValidate() {
    try {
      const result = await invokeApi(
        new URL(`${Resource.PapercutApiGateway.url}/list-shared-accounts`),
        event,
      );

      const { output } = validate(ListSharedAccountsResult, result, {
        Error: InternalServerError,
        message: "Failed to parse xml-rpc output",
      });

      return output;
    } catch (e) {
      throw httpError(e);
    }
  }

  const sharedAccounts: ListSharedAccountsOutput = [];
  do {
    sharedAccounts.push(...(await invokeAndValidate()));
  } while (sharedAccounts.length === event.input.limit);

  return sharedAccounts;
}

export async function listUserSharedAccounts(
  event: ListUserSharedAccountsEvent,
) {
  async function invokeAndValidate() {
    try {
      const result = await invokeApi(
        new URL(`${Resource.PapercutApiGateway.url}/list-user-shared-accounts`),
        event,
      );

      const { output } = validate(ListUserSharedAccountsResult, result, {
        Error: InternalServerError,
        message: "Failed to parse xml-rpc output",
      });

      return output;
    } catch (e) {
      throw httpError(e);
    }
  }

  const userSharedAccounts: ListUserSharedAccountsOutput = [];
  do {
    userSharedAccounts.push(...(await invokeAndValidate()));
  } while (userSharedAccounts.length === event.input.limit);

  return userSharedAccounts;
}

export async function getSharedAccountProperties(
  event: GetSharedAccountPropertiesEvent,
) {
  try {
    const result = await invokeApi(
      new URL(
        `${Resource.PapercutApiGateway.url}/get-shared-account-properties`,
      ),
      event,
    );

    const { output } = validate(GetSharedAccountPropertiesResult, result, {
      Error: InternalServerError,
      message: "Failed to parse xml-rpc output",
    });

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
