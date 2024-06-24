import { xmlRpcMethod } from "@paperwait/core/constants";
import {
  BadRequestError,
  HttpError,
  InternalServerError,
} from "@paperwait/core/errors";
import {
  ListUserSharedAccountsEvent,
  ListUserSharedAccountsOutput,
} from "@paperwait/core/schemas";
import { validate } from "@paperwait/core/valibot";
import { buildClient, XmlRpcFault } from "@paperwait/core/xml-rpc";

import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const { orgId, input } = validate(
      ListUserSharedAccountsEvent,
      JSON.parse(event.body ?? "{}"),
      {
        Error: BadRequestError,
        message: "Failed to parse event",
      },
    );

    const { client, authToken } = await buildClient(orgId);

    const value = await client.methodCall(xmlRpcMethod.listUserSharedAccounts, [
      authToken,
      ...Object.values(input),
    ]);

    const output = validate(ListUserSharedAccountsOutput, value, {
      Error: InternalServerError,
      message: "Failed to parse xml-rpc output",
    });

    return { statusCode: 200, body: JSON.stringify({ output }) };
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return { statusCode: e.statusCode, body: e.message };
    if (e instanceof XmlRpcFault) return { statusCode: 500, body: e.message };

    return { statusCode: 500, body: "Internal server error" };
  }
};
