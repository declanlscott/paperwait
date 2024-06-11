import { XmlRpcClient } from "@foxglove/xmlrpc";

import { getParameter } from "../aws/ssm";
import { InternalServerError, NotFoundError } from "../errors/http";
import { PapercutParameter } from "../papercut/parameter";
import { fn } from "../valibot";

export async function buildClient(orgId: string) {
  const config = await getConfig(orgId);

  const { client, authToken } = fn(
    PapercutParameter,
    ({ serverUrl, authToken }) => {
      const client = new XmlRpcClient(serverUrl);

      return { client, authToken };
    },
    {
      Error: InternalServerError,
      message: "Failed to parse PaperCut parameter",
    },
  )(JSON.parse(config));

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
