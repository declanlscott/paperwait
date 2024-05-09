import { XmlRpcClient } from "@foxglove/xmlrpc";

import { getParameter } from "../aws";
import { InternalServerError, NotFoundError } from "../errors";
import { papercutSchema } from "../papercut";
import { parseSchema } from "../utils";

export async function buildClient(orgId: string) {
  const config = await getConfig(orgId);
  const { serverUrl, authToken } = parseSchema(papercutSchema, config, {
    className: InternalServerError,
    message: "Failed to parse papercut config",
  });

  const client = new XmlRpcClient(`${serverUrl}/rpc/api/xmlrpc`);

  return { client, authToken };
}

async function getConfig(orgId: string) {
  const { Parameter } = await getParameter({
    Name: `/paperwait/org/${orgId}/papercut`,
    WithDecryption: true,
  });

  if (!Parameter?.Value)
    throw new NotFoundError("Failed to find papercut config");

  return Parameter.Value;
}
