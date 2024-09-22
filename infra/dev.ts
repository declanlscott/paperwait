import { db } from "./db";
import { replicacheLicenseKey } from "./meta";
import { partyKitApiKey } from "./realtime";

new sst.x.DevCommand("Studio", {
  link: [db],
  dev: {
    command: "pnpm db:studio",
    directory: "packages/core",
    autostart: true,
  },
});

new sst.x.DevCommand("PartyKit", {
  dev: {
    command: $interpolate`npx partykit dev --var API_KEY=${partyKitApiKey.result} --var REPLICACHE_LICENSE_KEY=${replicacheLicenseKey.value}`,
    directory: "packages/realtime",
    autostart: true,
  },
});
