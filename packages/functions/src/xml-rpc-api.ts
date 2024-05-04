import { XmlRpcClient, XmlRpcFault } from "@foxglove/xmlrpc";
import { getParameter } from "@paperwait/core/aws";
import {
  BadRequestError,
  HttpError,
  InternalServerError,
  NotFoundError,
} from "@paperwait/core/errors";
import { papercutSchema } from "@paperwait/core/papercut";
import { nanoIdSchema } from "@paperwait/core/utils";
import { inputSchema, outputSchema } from "@paperwait/core/xml-rpc";
import { object, safeParse } from "valibot";

import type { GetParameterCommandInput } from "@aws-sdk/client-ssm";
import type { XmlRpcValue } from "@foxglove/xmlrpc";
import type { Handler } from "aws-lambda";
import type { Output } from "valibot";

const eventSchema = object({
  orgId: nanoIdSchema,
  xmlRpc: inputSchema,
});
type Event = Output<typeof eventSchema>;

type Result =
  | {
      isSuccess: true;
      value: Output<typeof outputSchema>["value"];
    }
  | { isSuccess: false; reason: string };

export const handler: Handler<Event, Result> = async (event) => {
  try {
    const { orgId, xmlRpc } = parseEvent(event);

    const config = await getConfig(orgId);
    const { serverUrl, authToken } = parseConfig(config);

    const client = new XmlRpcClient(`${serverUrl}/rpc/api/xmlrpc`);
    const value = await client.methodCall(xmlRpc.methodName, [
      authToken,
      ...Object.values(xmlRpc.input),
    ]);

    const output = parseOutput(xmlRpc.methodName, value);

    return { isSuccess: true, value: output.value };
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError) return { isSuccess: false, reason: e.message };
    if (e instanceof XmlRpcFault)
      return { isSuccess: false, reason: e.message };

    return { isSuccess: false, reason: "Internal server error" };
  }
};

function parseEvent(event: Event) {
  const result = safeParse(eventSchema, event);

  if (!result.success) {
    console.log(result.issues);
    throw new BadRequestError("Failed to parse event");
  }

  return result.output;
}

async function getConfig(orgId: string) {
  const { Parameter } = await getParameter({
    Name: `/paperwait/org/${orgId}/papercut`,
    WithDecryption: true,
  } satisfies GetParameterCommandInput);

  if (!Parameter?.Value)
    throw new NotFoundError("Failed to find papercut config");

  return Parameter.Value;
}

function parseConfig(config: string) {
  const result = safeParse(papercutSchema, JSON.parse(config));

  if (!result.success) {
    console.log(result.issues);
    throw new InternalServerError("Failed to parse papercut config");
  }

  return result.output;
}

function parseOutput(methodName: string, value: XmlRpcValue) {
  const result = safeParse(outputSchema, { methodName, value });

  if (!result.success) {
    console.log(result.issues);
    throw new InternalServerError("Failed to parse xml-rpc output");
  }

  return result.output;
}
