import { auth } from "./auth";
import { db } from "./db";
import { domain } from "./dns";
import { client, meta } from "./meta";
import { realtime } from "./realtime";
import { storage } from "./storage";

export const reverseProxy = new sst.cloudflare.Worker("ReverseProxy", {
  handler: "packages/workers/src/reverse-proxy.ts",
  domain,
  transform: {
    worker: {
      serviceBindings: [
        {
          name: "SESSION_RATE_LIMITER",
          service: "paperwait-session-rate-limiter",
        },
        {
          name: "IP_RATE_LIMITER",
          service: "paperwait-ip-rate-limiter",
        },
      ],
      compatibilityFlags: ["nodejs_compat_v2"],
    },
  },
});

export const web = new sst.aws.Astro("Web", {
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
  domain: {
    name: domain,
    dns: sst.cloudflare.dns(),
  },
});
