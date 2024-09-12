import { db } from "./db";
import { domain } from "./dns";
import { client, meta } from "./meta";
import { oauth2 } from "./oauth2";
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
    },
  },
});

const username = new sst.Secret("Username");
const password = new sst.Secret("Password");
const basicAuth = $output([username.value, password.value]).apply(
  ([username, password]) =>
    Buffer.from(`${username}:${password}`).toString("base64"),
);

const architecture = "arm64";

export const web = new sst.aws.Astro("Web", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [client, db, meta, oauth2, realtime, storage],
  permissions: [
    {
      actions: ["ssm:PutParameter", "ssm:GetParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${meta.properties.awsRegion}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/max-file-sizes`,
      ],
    },
    {
      actions: ["ssm:PutParameter", "ssm:GetParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${meta.properties.awsRegion}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/documents-mime-types`,
      ],
    },
  ],
  domain: {
    name: domain,
    dns: sst.cloudflare.dns(),
  },
  server: {
    edge:
      $app.stage === "production"
        ? {
            viewerRequest: {
              injection: $interpolate`
                if (
                  !event.request.headers.authorization ||
                  event.request.headers.authorization.value !== "Basic ${basicAuth}"
                ) {
                  return {
                    statusCode: 401,
                    headers: {
                      "www-authenticate": { value: "Basic" }
                    }
                  };
                }
              `,
            },
          }
        : undefined,
    architecture,
    install: ["sharp"],
  },
  transform: {
    server: {
    },
  },
});
