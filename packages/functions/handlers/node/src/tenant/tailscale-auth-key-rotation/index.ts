// import { Tailscale } from "@paperwait/core/tailscale";

import { withSsm } from "src/tenant/tailscale-auth-key-rotation/lib/ssm";

import { withResource } from "./lib/resource";

import type { EventBridgeHandler } from "aws-lambda";

export const handler: EventBridgeHandler<string, unknown, void> = async (
  event,
  context,
) =>
  withResource(() =>
    withSsm(async () => {
      //
    }),
  );

// export const getHandler = () =>
//   withResource(() => {
//     const handler: EventBridgeHandler<string, unknown, void> = async (
//       event,
//       _context,
//     ) => {
//       const { AppData } = useResource();

//       const ssm = new Ssm.Client();

//       const [tailnet, oauthCredentials] = await Promise.all([
//         Tailscale.getTailnet(ssm, AppData),
//         Tailscale.getOauthCredentials(ssm, AppData),
//       ]);

//       const accessToken = await Tailscale.getAccessToken(oauthCredentials);

//       await Tailscale.createAuthKey({ tailnet, accessToken }, ssm, AppData);
//     };

//     return handler;
//   });
