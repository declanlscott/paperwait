sst.linkable(azuread.Application, ({ clientId }) => ({
  properties: { clientId },
}));

sst.linkable(azuread.ApplicationPassword, ({ value }) => ({
  properties: { value },
}));

sst.linkable(aws.ec2.Instance, ({ publicIp }) => ({
  properties: { publicIp },
}));

export * from "./astro";
export * from "./cron";
export * from "./secrets";
export * from "./entra-id";
export * from "./vpc";
export * from "./papercut";
