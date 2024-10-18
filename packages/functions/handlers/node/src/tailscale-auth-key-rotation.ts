import { Ssm } from "@paperwait/core/aws/ssm";
import { Tailscale } from "@paperwait/core/tailscale";
import { useResource, withResource } from "src/infra/resource";

import type { EventBridgeHandler } from "aws-lambda";

export const getHandler = () =>
  withResource(() => {
    const handler: EventBridgeHandler<string, unknown, void> = async (
      _event,
      _context,
    ) => {
      const { AppData } = useResource();

      const ssm = new Ssm.Client();

      const [tailnet, oauthCredentials] = await Promise.all([
        Tailscale.getTailnet(ssm, AppData),
        Tailscale.getOauthCredentials(ssm, AppData),
      ]);

      const accessToken = await Tailscale.getAccessToken(oauthCredentials);

      await Tailscale.createAuthKey({ tailnet, accessToken }, ssm, AppData);
    };

    return handler;
  });
