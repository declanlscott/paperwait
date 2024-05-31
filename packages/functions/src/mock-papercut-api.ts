import { xmlRpcMethod } from "@paperwait/core/constants";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import {
  fallback,
  integer,
  literal,
  number,
  object,
  parse,
  string,
  tuple,
  union,
  variant,
} from "valibot";

const xmlParser = new XMLParser();
const xmlBuilder = new XMLBuilder();

const sharedAccountPrefix = "shared-account-";

type Bindings = {
  IP_WHITELIST: string;
  AUTH_TOKEN: string;
};

const api = new Hono<{ Bindings: Bindings }>();

api.use("*", cors());
api.use(logger());
api.use(async (c, next) => {
  c.header("Content-Type", "text/xml");
  c.header("Cache-Control", "no-transform");
  await next();
});
api.use(async (c, next) => {
  const ip = c.req.header("cf-connecting-ip");
  if (!ip) throw new Error("Missing IP");

  if (c.env.IP_WHITELIST.split(",").includes(ip))
    throw new Error("IP not whitelisted");

  await next();
});

const stringParamSchema = object({ value: object({ string: string() }) });
const intParamSchema = object({ value: object({ int: number([integer()]) }) });
const booleanParamSchema = object({
  value: object({ boolean: union([literal(0), literal(1)]) }),
});
const doubleParamSchema = object({ value: object({ double: number() }) });

const schema = object({
  methodCall: variant("methodName", [
    object({
      methodName: literal(xmlRpcMethod.adjustSharedAccountAccountBalance),
      params: object({
        param: tuple([
          // auth token
          stringParamSchema,

          // shared account name
          stringParamSchema,

          // adjustment
          doubleParamSchema,
        ]),
      }),
    }),
    object({
      methodName: literal(xmlRpcMethod.isUserExists),
      params: object({
        param: tuple([
          // auth token
          stringParamSchema,

          // username
          stringParamSchema,
        ]),
      }),
    }),
    object({
      methodName: literal(xmlRpcMethod.listSharedAccounts),
      params: object({
        param: tuple([
          // auth token
          stringParamSchema,

          // offset
          intParamSchema,

          // limit
          intParamSchema,
        ]),
      }),
    }),
    object({
      methodName: literal(xmlRpcMethod.listUserSharedAccounts),
      params: object({
        param: tuple([
          // auth token
          stringParamSchema,

          // username
          stringParamSchema,

          // offset
          intParamSchema,

          // limit
          intParamSchema,

          // ignore user account selection config
          fallback(booleanParamSchema, { value: { boolean: 0 } }),
        ]),
      }),
    }),
    object({
      methodName: literal(xmlRpcMethod.getSharedAccountProperties),
      params: object({
        param: tuple([
          // auth token
          stringParamSchema,

          // shared account name
          stringParamSchema,
        ]),
      }),
    }),
  ]),
});

api.post("/", async (c) => {
  const text = await c.req.text();

  const rpc = parse(schema, xmlParser.parse(text));

  if (rpc.methodCall.params.param[0].value.string !== c.env.AUTH_TOKEN)
    throw new Error("Invalid auth token");

  const methodName = rpc.methodCall.methodName;
  switch (methodName) {
    case xmlRpcMethod.adjustSharedAccountAccountBalance:
      return c.body(
        `<?xml version="1.0"?>${xmlBuilder.build({
          methodResponse: {
            params: {
              param: {
                value: {
                  boolean: 1,
                },
              },
            },
          },
        })}`,
        200,
      );
    case xmlRpcMethod.getSharedAccountProperties: {
      const num = Number(
        rpc.methodCall.params.param[1].value.string.split("shared-account-")[1],
      );

      if (isNaN(num)) throw new Error("Invalid shared account name");

      return c.body(
        `<?xml version="1.0"?>${xmlBuilder.build({
          methodResponse: {
            params: {
              param: {
                value: {
                  data: [
                    { value: "access-groups" },
                    { value: "access-users" },
                    { value: `${sharedAccountPrefix}${num}` },
                    { value: 0 },
                    { value: "comment-option" },
                    { value: false },
                    { value: "invoice-option" },
                    { value: "notes" },
                    { value: 0 },
                    { value: "pin" },
                    { value: false },
                  ],
                },
              },
            },
          },
        })}`,
        200,
      );
    }
    case xmlRpcMethod.isUserExists:
      return c.body(
        `<?xml version="1.0"?>${xmlBuilder.build({
          methodResponse: {
            params: {
              param: {
                value: {
                  boolean: 1,
                },
              },
            },
          },
        })}`,
        200,
      );
    case xmlRpcMethod.listSharedAccounts:
      return c.body(
        `<?xml version="1.0"?>${xmlBuilder.build({
          methodResponse: {
            params: {
              param: {
                value: {
                  data: [
                    { value: `${sharedAccountPrefix}-1` },
                    { value: `${sharedAccountPrefix}-2` },
                    { value: `${sharedAccountPrefix}-3` },
                  ],
                },
              },
            },
          },
        })}`,
        200,
      );
    case xmlRpcMethod.listUserSharedAccounts:
      return c.body(
        `<?xml version="1.0"?>${xmlBuilder.build({
          methodResponse: {
            params: {
              param: {
                value: {
                  data: [
                    { value: `${sharedAccountPrefix}-1` },
                    { value: `${sharedAccountPrefix}-3` },
                  ],
                },
              },
            },
          },
        })}`,
        200,
      );
    default:
      methodName satisfies never;

      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown method: ${methodName}`);
  }
});

api.onError((error, c) => {
  console.error({ error });

  return c.body(
    `<?xml version="1.0"?>${xmlBuilder.build({
      methodResponse: {
        fault: {
          value: {
            struct: {
              member: [
                {
                  name: "faultCode",
                  value: {
                    int: -32500,
                  },
                },
                {
                  name: "faultString",
                  value: {
                    string: error.message,
                  },
                },
              ],
            },
          },
        },
      },
    })}`,
    200,
  );
});

export default api;
