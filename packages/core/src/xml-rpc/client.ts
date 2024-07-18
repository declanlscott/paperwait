import { XmlRpcClient } from "@foxglove/xmlrpc";

import { buildSsmParameterPath, getSsmParameter } from "../aws/ssm";
import { PAPERCUT_PARAMETER_NAME } from "../constants";
import { InternalServerError } from "../errors/http";
import { PapercutParameter } from "../schemas/papercut";
import { fn } from "../valibot";

export async function buildClient(orgId: string) {
  const config = await getSsmParameter({
    Name: buildSsmParameterPath(orgId, PAPERCUT_PARAMETER_NAME),
    WithDecryption: true,
  });

  const createClient = fn(
    PapercutParameter,
    ({ serverUrl, authToken }) => {
      const client = new XmlRpcClient(serverUrl);

      return { client, authToken };
    },
    {
      Error: InternalServerError,
      message: "Failed to parse PaperCut parameter",
    },
  );

  return createClient(JSON.parse(config));
}
