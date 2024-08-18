import { auth } from "./auth";
import { db } from "./db";
import { client, domain, isDev } from "./misc";
import { papercutApiGateway } from "./papercut";
import { realtime } from "./realtime";
import { storage } from "./storage";

export const web = new sst.aws.Astro("Paperwait", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [
    auth,
    client,
    db,
    domain,
    isDev,
    papercutApiGateway,
    realtime,
    storage,
  ],
  permissions: [
    {
      actions: ["ssm:PutParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/papercut`,
      ],
    },
    {
      actions: ["ssm:PutParameter", "ssm:GetParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/max-file-sizes`,
      ],
    },
    {
      actions: ["ssm:PutParameter", "ssm:GetParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/documents-mime-types`,
      ],
    },
    {
      actions: ["execute-api:Invoke"],
      resources: [
        $interpolate`arn:aws:execute-api:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:${papercutApiGateway.nodes.api.id}/*/POST/*`,
      ],
    },
  ],
  environment: {
    PROD: String($app.stage === "production"),
  },
});
