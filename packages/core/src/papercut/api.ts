import ky, { HTTPError as kyHttpError } from "ky";
import { Resource } from "sst";

import { apiGatewaySigner } from "../aws/signature-v4";
import {
  PAPERCUT_API_PAGINATION_LIMIT,
  PAPERCUT_API_TIMEOUT_MS,
} from "../constants";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  HttpError,
  InternalServerError,
  MethodNotAllowedError,
  NotFoundError,
  NotImplementedError,
  RequestTimeoutError,
  UnauthorizedError,
} from "../errors/http";
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
  TestPapercutEvent,
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
    throw await httpError(e);
  }
}

export async function listSharedAccounts(event: ListSharedAccountsEvent) {
  const sharedAccounts: ListSharedAccountsOutput = [];
  let page: ListSharedAccountsOutput;
  do {
    try {
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
    } catch (e) {
      throw await httpError(e);
    }
  } while (page.length === PAPERCUT_API_PAGINATION_LIMIT);

  return sharedAccounts;
}

export async function listUserSharedAccounts(
  event: ListUserSharedAccountsEvent,
) {
  const userSharedAccounts: ListUserSharedAccountsOutput = [];
  let page: ListUserSharedAccountsOutput;
  do {
    try {
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
    } catch (e) {
      throw await httpError(e);
    }
  } while (page.length === PAPERCUT_API_PAGINATION_LIMIT);

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
    throw await httpError(e);
  }
}

export async function testPapercut(event: TestPapercutEvent) {
  try {
    await invokeApi(
      new URL(`${Resource.PapercutApiGateway.url}/test-papercut`),
      event,
    );
  } catch (e) {
    throw await httpError(e);
  }
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

  return await ky
    .post(url, { body, headers, signal: controller.signal })
    .json();
}

async function httpError(e: unknown): Promise<HttpError> {
  console.error(e);

  if (e instanceof HttpError) return e;
  if (e instanceof kyHttpError) {
    const message = await e.response.text();

    switch (e.response.status) {
      case 400:
        return new BadRequestError(message);
      case 401:
        return new UnauthorizedError(message);
      case 403:
        return new ForbiddenError(message);
      case 404:
        return new NotFoundError(message);
      case 405:
        return new MethodNotAllowedError(message);
      case 408:
        return new RequestTimeoutError(message);
      case 409:
        return new ConflictError(message);
      case 501:
        return new NotImplementedError(message);
      default:
        return new InternalServerError(message);
    }
  }
  if (e instanceof Error && e.name === "AbortError")
    return new RequestTimeoutError();

  return new InternalServerError();
}
