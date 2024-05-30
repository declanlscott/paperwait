import { entraIdApp, entraIdClientSecret } from "./entra-id";
import { papercutApiGateway } from "./papercut";
import {
  dbCredentials,
  domain,
  googleCredentials,
  isDev,
  partyKitSecrets,
  replicacheLicenseKey,
} from "./secrets";

export const astro = new sst.aws.Astro("Paperwait", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [
    isDev,
    replicacheLicenseKey,
    ...Object.values(dbCredentials),
    ...Object.values(partyKitSecrets),
    entraIdApp,
    entraIdClientSecret,
    ...Object.values(googleCredentials),
    papercutApiGateway,
    domain,
  ],
  permissions: [
    {
      actions: ["ssm:PutParameter"],
      resources: [
        $interpolate`arn:aws:ssm:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:parameter/paperwait/org/*/papercut`,
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
