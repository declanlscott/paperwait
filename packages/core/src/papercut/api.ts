import { Resource } from "sst";

import { apiGatewaySigner } from "../aws/signature-v4";
import {
  PAPERCUT_API_PAGINATION_LIMIT,
  PAPERCUT_API_TIMEOUT_MS,
} from "../constants";
import {
  HttpError,
  InternalServerError,
  RequestTimeoutError,
} from "../errors/http";
import {
  GetSharedAccountPropertiesResult,
  IsUserExistsResult,
  ListSharedAccountsResult,
  ListUserSharedAccountsResult,
} from "../schemas/xml-rpc";
import { validate } from "../valibot";

import type {
  GetSharedAccountPropertiesEvent,
  IsUserExistsEvent,
  ListSharedAccountsEvent,
  ListSharedAccountsOutput,
  ListUserSharedAccountsEvent,
  ListUserSharedAccountsOutput,
  TestPapercutEvent,
} from "../schemas/xml-rpc";

export async function isUserExists(event: IsUserExistsEvent) {
  const result = await invokeApi(
    new URL(`${Resource.PapercutApiGateway.url}/is-user-exists`),
    event,
  );

  const { output } = validate(IsUserExistsResult, result, {
    Error: InternalServerError,
    message: "Failed to parse xml-rpc output",
  });

  return output;
}

export async function listSharedAccounts(event: ListSharedAccountsEvent) {
  const sharedAccounts: ListSharedAccountsOutput = [];
  let page: ListSharedAccountsOutput;
  do {
    const result = await invokeApi(
      new URL(`${Resource.PapercutApiGateway.url}/list-shared-accounts`),
      {
        ...event,
        input: {
          ...event.input,
          offset: sharedAccounts.length,
          limit: PAPERCUT_API_PAGINATION_LIMIT,
        },
      } satisfies ListSharedAccountsEvent,
    );

    page = validate(ListSharedAccountsResult, result, {
      Error: InternalServerError,
      message: "Failed to parse xml-rpc output",
    }).output;

    sharedAccounts.push(...page);
  } while (page.length === PAPERCUT_API_PAGINATION_LIMIT);

  return sharedAccounts;
}

export async function listUserSharedAccounts(
  event: ListUserSharedAccountsEvent,
) {
  const userSharedAccounts: ListUserSharedAccountsOutput = [];
  let page: ListUserSharedAccountsOutput;
  do {
    const result = await invokeApi(
      new URL(`${Resource.PapercutApiGateway.url}/list-user-shared-accounts`),
      {
        ...event,
        input: {
          ...event.input,
          offset: userSharedAccounts.length,
          limit: PAPERCUT_API_PAGINATION_LIMIT,
        },
      } satisfies ListUserSharedAccountsEvent,
    );

    page = validate(ListUserSharedAccountsResult, result, {
      Error: InternalServerError,
      message: "Failed to parse xml-rpc output",
    }).output;

    userSharedAccounts.push(...page);
  } while (page.length === PAPERCUT_API_PAGINATION_LIMIT);

  return userSharedAccounts;
}

export async function getSharedAccountProperties(
  event: GetSharedAccountPropertiesEvent,
) {
  const result = await invokeApi(
    new URL(`${Resource.PapercutApiGateway.url}/get-shared-account-properties`),
    event,
  );

  const { output } = validate(GetSharedAccountPropertiesResult, result, {
    Error: InternalServerError,
    message: "Failed to parse xml-rpc output",
  });

  return output;
}

export async function testPapercut(event: TestPapercutEvent) {
  await invokeApi(
    new URL(`${Resource.PapercutApiGateway.url}/test-papercut`),
    event,
  );
}

async function invokeApi(url: URL, event: unknown) {
  const controller = new AbortController();

  setTimeout(() => controller.abort(), PAPERCUT_API_TIMEOUT_MS);

  const body = JSON.stringify(event);

  const { headers } = await apiGatewaySigner.sign({
    hostname: url.hostname,
    protocol: url.protocol,
    method: "POST",
    path: url.pathname,
    headers: {
      host: url.hostname,
      accept: "application/json",
    },
    body,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      body,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) throw new HttpError(res.statusText, res.status);
    if (res.status === 204) return;

    return await res.json();
  } catch (e) {
    console.error(e);

    if (e instanceof Error && e.name === "AbortError")
      throw new RequestTimeoutError();

    throw e;
  }
}
