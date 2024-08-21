import { auth } from "./auth";
import { db } from "./db";
import { client, meta } from "./misc";
import { realtime } from "./realtime";
import { storage } from "./storage";

export const web = new sst.aws.Astro("Paperwait", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [auth, client, db, meta, realtime, storage],
  permissions: [
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
  ],
  environment: {
    PROD: String($app.stage === "production"),
  },
});
