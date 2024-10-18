import { add, isBefore } from "date-fns";
import createClient from "openapi-fetch";
import * as v from "valibot";

import { Ssm } from "../aws/ssm";
import { Constants } from "../constants";
import { HttpError } from "../errors/http";
import { tailscaleOauthCredentialsSchema } from "./shared";

import type { Resource } from "sst";
import type { components, operations, paths } from "./schema";
import type { TailscaleOauthCredentials } from "./shared";

export namespace Tailscale {
  export async function getTailnet(
    ssm: Ssm.Client,
    appData: Pick<Resource["AppData"], "name" | "stage">,
  ) {
    const parameter = await Ssm.getParameter(ssm, {
      Name: Ssm.buildParameterPath(appData, "tailscale", "tailnet"),
      WithDecryption: true,
    });

    return parameter;
  }

  export async function getOauthCredentials(
    ssm: Ssm.Client,
    appData: Pick<Resource["AppData"], "name" | "stage">,
  ): Promise<TailscaleOauthCredentials> {
    const parameter = await Ssm.getParameter(ssm, {
      Name: Ssm.buildParameterPath(appData, "tailscale", "oauth-client"),
      WithDecryption: true,
    });

    return v.parse(tailscaleOauthCredentialsSchema, JSON.parse(parameter));
  }

  export async function getAccessToken({ id, key }: TailscaleOauthCredentials) {
    const res = await fetch(`${Constants.TAILSCALE_API_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${key}`).toString("base64")}`,
      },
    });
    if (!res.ok) throw new HttpError(res.statusText, res.status);

    return v.parse(
      v.looseObject({
        access_token: v.pipe(v.string(), v.startsWith("tskey-api-")),
      }),
      await res.json(),
    ).access_token;
  }

  export const client = createClient<
    // For some reason, the OpenAPI schema doesn't include the `key` field in the response for creating an auth key.
    paths & {
      "/tailnet/{tailnet}/keys": {
        post: operations["createAuthKey"] & {
          responses: {
            200: {
              content: {
                "application/json": components["schemas"]["Key"] & {
                  key?: string;
                };
              };
            };
          };
        };
      };
    }
  >({ baseUrl: Constants.TAILSCALE_API_BASE_URL });

  export async function createAuthKey(
    props: {
      tailnet: string;
      accessToken: string;
    },
    ssm: Ssm.Client,
    appData: Pick<Resource["AppData"], "name" | "stage">,
  ) {
    const { tailnet, accessToken } = props;

    const result = await client.POST("/tailnet/{tailnet}/keys", {
      params: {
        path: { tailnet },
        query: { all: true },
      },
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        capabilities: {
          devices: {
            create: {
              reusable: true,
              ephemeral: true,
              preauthorized: false,
              tags: [`tag:${Constants.TAILSCALE_TAG_NAME}`],
            },
          },
        },
        expirySeconds:
          Constants.TAILSCALE_AUTH_KEY_LIFETIME.days * 24 * 60 * 60,
        description: `${appData.name} papercut secure bridge - ${appData.stage}`,
      },
    });
    if (result.error)
      throw new HttpError(result.error.message, result.response.status);

    if (!result.data.id) throw new Error("Missing 'id' field");
    if (!result.data.key) throw new Error("Missing 'key' field");

    await Ssm.putParameter(ssm, {
      Name: Ssm.buildParameterPath(appData, "tailscale", "auth"),
      Type: "SecureString",
      Value: JSON.stringify({ id: result.data.id, key: result.data.key }),
      Overwrite: true,
    });

    return result.data;
  }

  export type AuthKeyVerificationResult =
    | {
        isVerified: true;
      }
    | {
        isVerified: false;
        reason: "expired";
        expired: string;
      }
    | {
        isVerified: false;
        reason: "expiring";
        expiring: string;
      }
    | {
        isVerified: false;
        reason: "revoked";
        revoked: string;
      }
    | {
        isVerified: false;
        reason: "capability";
        capability: string;
      };

  export async function verifyAuthKey(props: {
    tailnet: string;
    keyId: string;
    accessToken: string;
  }): Promise<AuthKeyVerificationResult> {
    const { tailnet, keyId, accessToken } = props;

    const result = await client.GET("/tailnet/{tailnet}/keys/{keyId}", {
      params: { path: { tailnet, keyId } },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (result.error)
      throw new HttpError(result.error.message, result.response.status);

    const expires = result.data.expires;
    if (expires === undefined) throw new Error("Missing 'expires' field");
    const now = new Date();

    if (isBefore(expires, now))
      return {
        isVerified: false,
        reason: "expired",
        expired: expires,
      };

    if (isBefore(expires, add(now, { days: 60 })))
      return {
        isVerified: false,
        reason: "expiring",
        expiring: expires,
      };

    if (result.data.revoked && isBefore(result.data.revoked, now))
      return {
        isVerified: false,
        reason: "revoked",
        revoked: result.data.revoked,
      };

    const reuseable = result.data.capabilities?.devices?.create?.reusable;
    if (reuseable === undefined) throw new Error("Missing 'reusable' field");
    if (!reuseable)
      return {
        isVerified: false,
        reason: "capability",
        capability: "reusable",
      };

    const ephemeral = result.data.capabilities?.devices?.create?.ephemeral;
    if (ephemeral === undefined) throw new Error("Missing 'ephemeral' field");
    if (!ephemeral)
      return {
        isVerified: false,
        reason: "capability",
        capability: "ephemeral",
      };

    const tags = result.data.capabilities?.devices?.create?.tags;
    if (tags === undefined) throw new Error("Missing 'tags' field");
    if (!tags.includes(`tag:${Constants.TAILSCALE_TAG_NAME}`))
      return { isVerified: false, reason: "capability", capability: "tag" };

    return { isVerified: true };
  }

  export async function listKeys(props: {
    tailnet: string;
    accessToken: string;
  }) {
    const { tailnet, accessToken } = props;

    const result = await client.GET("/tailnet/{tailnet}/keys", {
      params: { path: { tailnet }, query: { all: true } },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (result.error)
      throw new HttpError(result.error.message, result.response.status);

    return result.data;
  }

  export async function deleteAuthKey(
    props: {
      tailnet: string;
      keyId: string;
      accessToken: string;
    },
    ssm: Ssm.Client,
    appData: Pick<Resource["AppData"], "name" | "stage">,
  ) {
    const { tailnet, keyId, accessToken } = props;

    const result = await client.DELETE("/tailnet/{tailnet}/keys/{keyId}", {
      params: { path: { tailnet, keyId } },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (result.error)
      throw new HttpError(result.error.message, result.response.status);

    await Ssm.deleteParameter(ssm, {
      Name: Ssm.buildParameterPath(appData, "tailscale", "auth"),
    });
  }
}
