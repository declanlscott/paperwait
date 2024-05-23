import { spawn } from "child_process";
import { resolve } from "path";

import type { Resource } from "sst";

const rawResource = (() => {
  const prefix = "SST_RESOURCE_";

  const raw = Object.entries(process.env).reduce(
    (raw, [key, value]) => {
      if (key.startsWith(prefix) && value)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        raw[key.slice(prefix.length)] = JSON.parse(value);

      return raw;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as Record<string, any>,
  );

  if (Object.keys(raw).length === 0)
    throw new Error(`No resources found. Did you forget to run in sst shell?`);

  return raw;
})();

const resource = new Proxy(rawResource, {
  get(target, prop: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (prop in target) return target[prop];

    throw new Error(`Resource "${prop}" not found.`);
  },
}) as Resource;

function buildCommand(customArgs: string[] = []) {
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
      `API_KEY=${resource.PartyKitApiKey.value}`,
      "--var",
      `REPLICACHE_LICENSE_KEY=${resource.ClientReplicacheLicenseKey.value}`,
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
