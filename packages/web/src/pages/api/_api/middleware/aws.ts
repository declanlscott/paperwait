import { Api } from "@printworks/core/api";
import { Ssm, Sts, withAws } from "@printworks/core/utils/aws";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

export const ssmClient = (name: string) =>
  createMiddleware(async (_, next) =>
    withAws(
      async () => ({
        ssm: {
          client: new Ssm.Client({
            credentials: await Sts.getAssumeRoleCredentials({
              type: "name",
              accountId: await Api.getAccountId(),
              roleName: Resource.Aws.tenant.putParametersRole.name,
              roleSessionName: name,
            }),
          }),
        },
      }),
      next,
      () => ({ sts: { client: new Sts.Client() } }),
    ),
  );
