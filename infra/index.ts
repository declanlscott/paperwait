sst.linkable(azuread.Application, ({ clientId }) => ({
  properties: { clientId },
}));

sst.linkable(azuread.ApplicationPassword, ({ value }) => ({
  properties: { value },
}));

sst.linkable(aws.ec2.Instance, ({ publicIp }) => ({
  properties: { publicIp },
}));

sst.linkable(tls.PrivateKey, ({ privateKeyPem }) => ({
  properties: { privateKeyPem },
}));

sst.linkable(aws.cloudfront.PublicKey, ({ id, encodedKey }) => ({
  properties: { id, encodedKey },
}));

sst.linkable(aws.cloudfront.Distribution, ({ domainName }) => ({
  properties: { domainName },
}));

export * from "./buckets";
export * from "./astro";
export * from "./cron";
export * from "./secrets";
export * from "./entra-id";
export * from "./vpc";
export * from "./papercut";
