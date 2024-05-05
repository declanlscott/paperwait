import { entraIdApp, entraIdClientSecret } from "./entra-id";
import {
  databaseUrl,
  googleClientId,
  googleClientSecret,
  isDev,
  replicacheLicenseKey,
} from "./secrets";
import { permission } from "./utils";
import { xmlRpcApi } from "./xml-rpc-api";

export const astro = new sst.aws.Astro("Paperwait", {
  path: "packages/web",
  buildCommand: "pnpm build",
  link: [
    isDev,
    replicacheLicenseKey,
    databaseUrl,
    entraIdApp,
    entraIdClientSecret,
    googleClientId,
    googleClientSecret,
    xmlRpcApi,
  ],
  permissions: [permission.papercutParameter],
  environment: {
    PROD: String($app.stage === "production"),
  },
});
