/**
 * Mock PaperCut API
 * Based on the PaperCut Public XML Web Services API
 * https://www.papercut.com/help/manuals/ng-mf/common/tools-web-services/
 */

import { xmlRpcMethod } from "@paperwait/core/constants";
import { validate } from "@paperwait/core/valibot";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { Hono } from "hono";
import { getConnInfo } from "hono/cloudflare-workers";
import { except } from "hono/combine";
import { cors } from "hono/cors";
import { ipRestriction } from "hono/ip-restriction";
import { logger } from "hono/logger";
import { Resource } from "sst";
import * as v from "valibot";

const xmlParser = new XMLParser();
const xmlBuilder = new XMLBuilder();

const sharedAccountPrefix = "shared-account-";

const stringParamSchema = v.object({ value: v.object({ string: v.string() }) });
const intParamSchema = v.object({
  value: v.object({ int: v.pipe(v.number(), v.integer()) }),
});
const booleanParamSchema = v.object({
  value: v.object({ boolean: v.union([v.literal(0), v.literal(1)]) }),
});
const doubleParamSchema = v.object({ value: v.object({ double: v.number() }) });

const schema = v.object({
  methodCall: v.variant("methodName", [
    v.object({
      methodName: v.literal(xmlRpcMethod.adjustSharedAccountAccountBalance),
      params: v.object({
        param: v.tuple([
          // auth token
          stringParamSchema,

          // shared account name
          stringParamSchema,

          // adjustment
          doubleParamSchema,
        ]),
      }),
    }),
    v.object({
      methodName: v.literal(xmlRpcMethod.isUserExists),
      params: v.object({
        param: v.tuple([
          // auth token
          stringParamSchema,

          // username
          stringParamSchema,
        ]),
      }),
    }),
    v.object({
      methodName: v.literal(xmlRpcMethod.listSharedAccounts),
      params: v.object({
        param: v.tuple([
          // auth token
          stringParamSchema,

          // offset
          intParamSchema,

          // limit
          intParamSchema,
        ]),
      }),
    }),
    v.object({
      methodName: v.literal(xmlRpcMethod.listUserSharedAccounts),
      params: v.object({
        param: v.tuple([
          // auth token
          stringParamSchema,

          // username
          stringParamSchema,

          // offset
          intParamSchema,

          // limit
          intParamSchema,

          // ignore user account selection config
          v.fallback(booleanParamSchema, { value: { boolean: 0 } }),
        ]),
      }),
    }),
    v.object({
      methodName: v.literal(xmlRpcMethod.getSharedAccountProperties),
      params: v.object({
        param: v.tuple([
          // auth token
          stringParamSchema,

          // shared account name
          stringParamSchema,
        ]),
      }),
    }),
  ]),
});

const api = new Hono<{
  Bindings: {
    AUTH_TOKEN: string;
  };
}>()
  .use("*", cors())
  .use("*", logger())
  .use("*", async (c, next) => {
    c.header("Content-Type", "text/xml");
    c.header("Cache-Control", "no-transform");

    await next();
  })
  .use("*", async (c, next) => {
    const natIp = Resource.NatInstance.publicIp;

    const whitelistIp = except(
      () => Resource.ClientIsDev.value === "true",
      ipRestriction(getConnInfo, { denyList: [], allowList: [natIp] }),
    );

    await whitelistIp(c, next);
  })
  .post("/", async (c) => {
    const text = await c.req.text();

    const rpc = validate(schema, xmlParser.parse(text));

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
          rpc.methodCall.params.param[1].value.string.split(
            sharedAccountPrefix,
          )[1],
        );

        if (isNaN(num)) throw new Error("Invalid shared account name");

        return c.body(
          `<?xml version="1.0"?>${xmlBuilder.build({
            methodResponse: {
              params: {
                param: {
                  value: {
                    array: {
                      data: {
                        value: [
                          "access-groups",
                          "access-users",
                          num,
                          0,
                          "comment-option",
                          false,
                          "invoice-option",
                          "notes",
                          0,
                          "pin",
                          false,
                        ],
                      },
                    },
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
                    array: {
                      data: {
                        value: [
                          `${sharedAccountPrefix}1`,
                          `${sharedAccountPrefix}2`,
                          `${sharedAccountPrefix}3`,
                        ],
                      },
                    },
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
                    array: {
                      data: {
                        value: [
                          `${sharedAccountPrefix}1`,
                          `${sharedAccountPrefix}3`,
                        ],
                      },
                    },
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
  })
  .onError((error, c) => {
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
