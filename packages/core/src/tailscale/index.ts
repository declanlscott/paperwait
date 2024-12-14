import { Ssm } from "../utils/aws";
import { Constants } from "../utils/constants";

export namespace Tailscale {
  export const setOauthClient = async (id: string, secret: string) =>
    Ssm.putParameter({
      Name: Constants.TAILSCALE_OAUTH_CLIENT_PARAMETER_NAME,
      Value: JSON.stringify({ id, secret }),
      Type: "SecureString",
    });
}
