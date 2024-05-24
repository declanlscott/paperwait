import { XmlRpcClient } from "@foxglove/xmlrpc";

import { getParameter } from "../aws/ssm";
import { InternalServerError, NotFoundError } from "../errors/http";
import { PaperCutParameter } from "../papercut/schema";
import { parseSchema } from "../valibot";

export async function buildClient(orgId: string) {
  const config = await getConfig(orgId);
  const { serverUrl, authToken } = parseSchema(
    PaperCutParameter,
    JSON.parse(config),
    {
      Error: InternalServerError,
      message: "Failed to parse papercut config",
    },
  );

  const client = new XmlRpcClient(serverUrl);

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
