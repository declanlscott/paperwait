import { spawn } from "child_process";
import * as path from "path";

import {
  ENV_RESOURCE_PREFIX,
  REALTIME_ENV_KEY,
} from "@paperwait/core/constants";

import type { Resource } from "sst";

type EnvVars = {
  apiKey: Resource["PartyKitApiKey"]["value"];
  replicacheLicenseKey: Resource["ClientReplicacheLicenseKey"]["value"];
};

function buildResource() {
  // Extract resource from environment variables
  const resource = Object.entries(process.env).reduce(
    (resource, [key, value]) => {
      if (key.startsWith(ENV_RESOURCE_PREFIX) && value) {
        // Remove prefix and parse JSON
        resource[key.slice(ENV_RESOURCE_PREFIX.length)] = JSON.parse(
          value,
        ) as unknown;
      }

      return resource;
    },
    {} as Resource,
  );

  if (Object.keys(resource).length === 0) {
    throw new Error("Resource is empty. Are you not running in sst shell?");
  }

  return resource;
}

function buildCommand(envVars: EnvVars) {
  const mode = process.argv[2];

  switch (mode) {
    case "dev":
    case "deploy":
      return {
        command: "npx",
        args: [
          "partykit",
          mode,
          "--var",
          `${REALTIME_ENV_KEY.API_KEY}=${envVars.apiKey}`,
          "--var",
          `${REALTIME_ENV_KEY.REPLICACHE_LICENSE_KEY}=${envVars.replicacheLicenseKey}`,
        ],
      } as const;
    default:
      throw new Error(
        `Invalid mode argument "${mode}". Must be "dev" or "deploy".`,
      );
  }
}

function main() {
  try {
    const resource = buildResource();

    const { command, args } = buildCommand({
      apiKey: resource.PartyKitApiKey.value,
      replicacheLicenseKey: resource.ClientReplicacheLicenseKey.value,
    });

    const process = spawn(command, args, {
      stdio: "inherit",
      cwd: path.resolve(__dirname, "../../realtime"),
    });

    process.on("spawn", () => {
      console.log(">", command, ...args);
    });
  } catch (e) {
    console.error("❌", e);
    process.exit(1);
  }
}

main();
