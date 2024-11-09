import { db } from "./db";

new sst.x.DevCommand("Studio", {
  link: [db],
  dev: {
    command: "pnpm db:studio",
    directory: "packages/core",
    autostart: true,
  },
});
