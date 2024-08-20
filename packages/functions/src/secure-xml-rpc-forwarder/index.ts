import http from "http";

import { SocksProxyAgent } from "socks-proxy-agent";

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";

const TARGET_HOSTNAME = process.env.TARGET_HOSTNAME;
if (!TARGET_HOSTNAME) throw new Error("TARGET_HOSTNAME is not set");

const TARGET_PORT = process.env.TARGET_PORT;
if (!TARGET_PORT) throw new Error("TARGET_PORT is not set");

const proxyHttpRequest = async (
  options: http.RequestOptions,
  body: APIGatewayProxyEventV2["body"],
): Promise<APIGatewayProxyResultV2> =>
  new Promise((resolve, reject) => {
    const data: Array<Buffer> = [];

    const req = http.request(options, (res) => {
      res.on("data", (buffer: Buffer) => data.push(buffer));

      res.on("end", () =>
        resolve({
          statusCode: res.statusCode ?? 500,
          headers: res.headers as Record<string, string>,
          body: Buffer.concat(data).toString(),
          isBase64Encoded: false,
        }),
      );

      res.on("error", (error) => reject(error));
    });

    req.on("error", (error) => reject(error));

    req.write(body);

    req.end();
  });

export const handler: APIGatewayProxyHandlerV2 = async (event) =>
  await proxyHttpRequest(
    {
      hostname: TARGET_HOSTNAME,
      port: TARGET_PORT,
      path: event.requestContext.http.path,
      method: "POST",
      agent: new SocksProxyAgent("socks://localhost:1055"),
    },
    event.body,
  );
