import { XmlRpcClient, XmlRpcFault } from "@foxglove/xmlrpc";
import { getParameter } from "@paperwait/core/aws";
import {
  BadRequestError,
  HttpError,
  InternalServerError,
  NotFoundError,
} from "@paperwait/core/errors";
import { papercutSchema } from "@paperwait/core/papercut";
import { parseSchema } from "@paperwait/core/utils";
import { xmlRpcEventSchema, xmlRpcOutputSchema } from "@paperwait/core/xml-rpc";

import type { XmlRpcEvent, XmlRpcResult } from "@paperwait/core/xml-rpc";
import type { Handler } from "aws-lambda";

export const handler: Handler<XmlRpcEvent, XmlRpcResult> = async (event) => {
  try {
    const { orgId, xmlRpc } = parseSchema(xmlRpcEventSchema, event, {
      className: BadRequestError,
      message: "Failed to parse event",
    });

    const config = await getConfig(orgId);
    const { serverUrl, authToken } = parseSchema(papercutSchema, config, {
      className: InternalServerError,
      message: "Failed to parse papercut config",
    });

    const client = new XmlRpcClient(`${serverUrl}/rpc/api/xmlrpc`);
    const value = await client.methodCall(xmlRpc.methodName, [
      authToken,
      ...Object.values(xmlRpc.input),
    ]);

    const output = parseSchema(
      xmlRpcOutputSchema,
      { methodName: xmlRpc.methodName, value },
      {
        className: InternalServerError,
        message: "Failed to parse xml-rpc output",
      },
    );

    return { isSuccess: true, value: output.value };
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError) return { isSuccess: false, reason: e.message };
    if (e instanceof XmlRpcFault)
      return { isSuccess: false, reason: e.message };

    return { isSuccess: false, reason: "Internal server error" };
  }
};

async function getConfig(orgId: string) {
  const { Parameter } = await getParameter({
    Name: `/paperwait/org/${orgId}/papercut`,
    WithDecryption: true,
  });

  if (!Parameter?.Value)
    throw new NotFoundError("Failed to find papercut config");

  return Parameter.Value;
}
