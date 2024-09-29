import { spawn } from "child_process";
import { resolve } from "path";

import { parseResource } from "@paperwait/core/utils/helpers";

import type { Resource } from "sst";

const resource = parseResource<Resource>();

function buildCommand(customArgs: Array<string> = []) {
  const mode = process.argv[2];

  switch (mode) {
    case "dev":
    case "deploy":
      return {
        command: "npx",
        args: ["partykit", mode, ...customArgs],
      };
    default:
      throw new Error(
        `Invalid mode argument "${mode}". Must be "dev" or "deploy".`,
      );
  }
}

function main() {
  try {
    const { command, args } = buildCommand([
      "--var",
      `API_KEY=${resource.Realtime.apiKey}`,
      "--var",
      `REPLICACHE_LICENSE_KEY=${resource.ReplicacheLicenseKey.value}`,
    ]);

    const process = spawn(command, args, {
      stdio: "inherit",
      cwd: resolve(__dirname, "../../realtime"),
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
