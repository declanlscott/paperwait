import {
  BadRequestError,
  HttpError,
  InternalServerError,
  XmlRpcFault,
} from "@paperwait/core/errors";
import { parseSchema } from "@paperwait/core/utils";
import {
  buildClient,
  isUserExistsEventBodySchema,
  isUserExistsOutputSchema,
  xmlRpcMethod,
} from "@paperwait/core/xml-rpc";

import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const { orgId, input } = parseSchema(
      isUserExistsEventBodySchema,
      event.body,
      {
        className: BadRequestError,
        message: "Failed to parse event",
      },
    );

    const { client, authToken } = await buildClient(orgId);

    const value = await client.methodCall(xmlRpcMethod.isUserExists, [
      authToken,
      ...Object.values(input),
    ]);

    const output = parseSchema(isUserExistsOutputSchema, value, {
      className: InternalServerError,
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
