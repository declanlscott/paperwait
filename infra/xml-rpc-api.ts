import { permission } from "./utils";

export const xmlRpcApi = new sst.aws.Function("XmlRpcApi", {
  handler: "packages/functions/src/xml-rpc-api.handler",
  timeout: "10 seconds",
  permissions: [permission.papercutParameter],
});
