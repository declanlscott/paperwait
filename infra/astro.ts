import { entraIdApp, entraIdClientSecret } from "./entra-id";
import { papercutApiGateway } from "./papercut-api";
import {
  databaseUrl,
  googleClientId,
  googleClientSecret,
  isDev,
  partyKitApiKey,
  replicacheLicenseKey,
} from "./secrets";

export const astro = new sst.aws.Astro("Paperwait", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [
    isDev,
    replicacheLicenseKey,
    databaseUrl,
    partyKitApiKey,
    entraIdApp,
    entraIdClientSecret,
    googleClientId,
    googleClientSecret,
    papercutApiGateway,
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
