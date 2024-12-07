import { dsqlCluster } from "./db";

new sst.x.DevCommand("Studio", {
  link: [dsqlCluster],
  dev: {
    command: "pnpm db:studio",
    directory: "packages/core",
    autostart: true,
  },
});
