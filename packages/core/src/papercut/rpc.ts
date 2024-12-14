import * as v from "valibot";

import { Papercut } from ".";
import { Api } from "../api";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";

export namespace PapercutRpc {
  const path = "/papercut/rpc/api/xmlrpc";

  const faultResponseSchema = v.object({
    ["?xml"]: v.literal(""),
    methodResponse: v.object({
      fault: v.object({
        value: v.object({
          struct: v.object({
            member: v.tuple([
              v.object({
                name: v.literal("faultString"),
                value: v.string(),
              }),
              v.object({
                name: v.literal("faultCode"),
                value: v.object({ int: v.number() }),
              }),
            ]),
          }),
        }),
      }),
    }),
  });

  const listResponseSchema = v.object({
    ["?xml"]: v.literal(""),
    methodResponse: v.object({
      params: v.object({
        param: v.object({
          value: v.object({
            array: v.object({
              data: v.object({
                value: v.array(v.string()),
              }),
            }),
          }),
        }),
      }),
    }),
  });

  export async function adjustSharedAccountAccountBalance(
    sharedAccountName: string,
    amount: number,
    comment: string,
  ) {
    const authToken = await Papercut.getServerAuthToken();

    const res = await Api.send(path, {
      method: "POST",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: Utils.xmlBuilder.build({
        methodCall: {
          methodName: "api.adjustSharedAccountAccountBalance",
          params: {
            param: [
              { value: { string: authToken } },
              { value: { string: sharedAccountName } },
              { value: { double: amount } },
              { value: { string: comment } },
            ],
          },
        },
      }),
    });
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    const success = v.parse(
      v.pipe(
        v.union([
          v.object({
            ["?xml"]: v.literal(""),
            methodResponse: v.object({
              params: v.object({
                param: v.object({
                  value: v.object({ boolean: v.picklist([0, 1]) }),
                }),
              }),
            }),
          }),
          faultResponseSchema,
        ]),
        v.transform((xml) => {
          if ("fault" in xml.methodResponse)
            throw new HttpError.InternalServerError(
              xml.methodResponse.fault.value.struct.member[0].value,
            );

          return xml.methodResponse.params.param.value.boolean === 1;
        }),
      ),
      await res.text(),
    );

    return success;
  }

  export async function getSharedAccountProperties(
    sharedAccountName: string,
    propertyNames: Array<string>,
  ) {
    const authToken = await Papercut.getServerAuthToken();

    const res = await Api.send(path, {
      method: "POST",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: Utils.xmlBuilder.build({
        methodCall: {
          methodName: "api.getSharedAccountProperties",
          params: {
            param: [
              { value: { string: authToken } },
              { value: { string: sharedAccountName } },
              {
                value: {
                  array: {
                    data: {
                      value: propertyNames.map((name) => ({
                        string: name,
                      })),
                    },
                  },
                },
              },
            ],
          },
        },
      }),
    });
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    const properties = v.parse(
      v.pipe(
        v.union([
          v.object({
            ["?xml"]: v.literal(""),
            methodResponse: v.object({
              params: v.object({
                param: v.object({
                  value: v.object({
                    array: v.object({
                      data: v.object({
                        value: v.array(v.union([v.string(), v.number()])),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
          faultResponseSchema,
        ]),
        v.transform((xml) => {
          if ("fault" in xml.methodResponse)
            throw new HttpError.InternalServerError(
              xml.methodResponse.fault.value.struct.member[0].value,
            );

          return xml.methodResponse.params.param.value.array.data.value;
        }),
      ),
      await res.text(),
    );

    return properties;
  }

  export async function getTaskStatus() {
    const res = await Api.send(path, {
      method: "POST",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: Utils.xmlBuilder.build({
        methodCall: { methodName: "api.getTaskStatus" },
      }),
    });
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    const taskStatus = v.parse(
      v.pipe(
        v.union([
          v.object({
            ["?xml"]: v.literal(""),
            methodResponse: v.object({
              params: v.object({
                param: v.object({
                  value: v.object({
                    struct: v.object({
                      member: v.tuple([
                        v.object({
                          name: v.literal("completed"),
                          value: v.object({ boolean: v.picklist([0, 1]) }),
                        }),
                        v.object({
                          name: v.literal("message"),
                          value: v.string(),
                        }),
                      ]),
                    }),
                  }),
                }),
              }),
            }),
          }),
          faultResponseSchema,
        ]),
        v.transform((xml) => {
          if ("fault" in xml.methodResponse)
            throw new HttpError.InternalServerError(
              xml.methodResponse.fault.value.struct.member[0].value,
            );

          return {
            completed:
              xml.methodResponse.params.param.value.struct.member[0].value
                .boolean === 1,
            message:
              xml.methodResponse.params.param.value.struct.member[1].value,
          };
        }),
      ),
      await res.text(),
    );

    return taskStatus;
  }

  export async function listSharedAccounts() {
    const authToken = await Papercut.getServerAuthToken();

    const all: Array<string> = [];
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await Api.send(path, {
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: Utils.xmlBuilder.build({
          methodCall: {
            methodName: "api.listSharedAccounts",
            params: {
              param: [
                { value: { string: authToken } },
                { value: { int: offset } },
                { value: { int: Constants.PAPERCUT_API_PAGINATION_LIMIT } },
              ],
            },
          },
        }),
      });
      if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

      const sharedAccounts = v.parse(
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml.methodResponse)
              throw new HttpError.InternalServerError(
                xml.methodResponse.fault.value.struct.member[0].value,
              );

            return xml.methodResponse.params.param.value.array.data.value;
          }),
        ),
        await res.text(),
      );

      all.push(...sharedAccounts);

      offset += Constants.PAPERCUT_API_PAGINATION_LIMIT;
      hasMore =
        sharedAccounts.length === Constants.PAPERCUT_API_PAGINATION_LIMIT;
    } while (hasMore);

    return all;
  }

  export async function listUserAccounts() {
    const authToken = await Papercut.getServerAuthToken();

    const all: Array<string> = [];
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await Api.send(path, {
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: Utils.xmlBuilder.build({
          methodCall: {
            methodName: "api.listUserAccounts",
            params: {
              param: [
                { value: { string: authToken } },
                { value: { int: offset } },
                { value: { int: Constants.PAPERCUT_API_PAGINATION_LIMIT } },
              ],
            },
          },
        }),
      });
      if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

      const userAccounts = v.parse(
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml.methodResponse)
              throw new HttpError.InternalServerError(
                xml.methodResponse.fault.value.struct.member[0].value,
              );

            return xml.methodResponse.params.param.value.array.data.value;
          }),
        ),
        await res.text(),
      );

      all.push(...userAccounts);

      offset += Constants.PAPERCUT_API_PAGINATION_LIMIT;
      hasMore = userAccounts.length === Constants.PAPERCUT_API_PAGINATION_LIMIT;
    } while (hasMore);

    return all;
  }

  export async function listUserSharedAccounts(
    username: string,
    ignoreUserAccountSelectionConfig: boolean,
  ) {
    const authToken = await Papercut.getServerAuthToken();

    const all: Array<string> = [];
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await Api.send(path, {
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: Utils.xmlBuilder.build({
          methodCall: {
            methodName: "api.listUserSharedAccounts",
            params: [
              { value: { string: authToken } },
              { value: { string: username } },
              { value: { int: offset } },
              { value: { int: Constants.PAPERCUT_API_PAGINATION_LIMIT } },
              { value: { boolean: ignoreUserAccountSelectionConfig ? 1 : 0 } },
            ],
          },
        }),
      });
      if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

      const userSharedAccounts = v.parse(
        v.pipe(
          v.union([listResponseSchema, faultResponseSchema]),
          v.transform((xml) => {
            if ("fault" in xml.methodResponse)
              throw new HttpError.InternalServerError(
                xml.methodResponse.fault.value.struct.member[0].value,
              );

            return xml.methodResponse.params.param.value.array.data.value;
          }),
        ),
        await res.text(),
      );

      all.push(...userSharedAccounts);

      offset += Constants.PAPERCUT_API_PAGINATION_LIMIT;
      hasMore =
        userSharedAccounts.length === Constants.PAPERCUT_API_PAGINATION_LIMIT;
    } while (hasMore);

    return all;
  }
}
