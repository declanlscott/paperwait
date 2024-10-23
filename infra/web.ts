import { db } from "./db";
import { appFqdn } from "./dns";
import { appData, client, cloud } from "./misc";
import { oauth2 } from "./oauth2";
import { realtime } from "./realtime";
import { webPassword, webUsername } from "./secrets";
import { tenantInfraQueue } from "./storage";

export const reverseProxy = new sst.cloudflare.Worker("ReverseProxy", {
  handler: "packages/workers/src/reverse-proxy.ts",
  domain: appFqdn,
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

const basicAuth = $output([webUsername.value, webPassword.value]).apply(
  ([username, password]) =>
    Buffer.from(`${username}:${password}`).toString("base64"),
);

sst.Linkable.wrap(sst.aws.Astro, (astro) => ({
  properties: {
    url: astro.url,
    server: {
      role: {
        principal: astro.nodes.server?.nodes.role.arn ?? "*",
      },
    },
  },
}));

export const web = new sst.aws.Astro("Web", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [appData, client, db, oauth2, realtime, tenantInfraQueue],
  permissions: [
    {
      actions: ["execute-api:Invoke"],
      resources: [
        $interpolate`arn:aws:execute-api:${cloud.properties.aws.region}:*:${appData.properties.stage}/*`,
      ],
    },
  ],
  domain: {
    name: appFqdn,
    dns: sst.cloudflare.dns(),
  },
  server: {
    edge:
      $app.stage !== "production"
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
    architecture: "arm64",
    install: ["sharp"],
  },
});

Object.entries(web.getSSTLink().properties).forEach(([key, value]) => {
  $util.output(value).apply((value) => console.log(key, value));
});

export const outputs = {
  url: reverseProxy.url,
};
