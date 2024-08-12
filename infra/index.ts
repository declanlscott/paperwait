sst.Linkable.wrap(azuread.Application, ({ clientId }) => ({
  properties: { clientId },
}));

sst.Linkable.wrap(azuread.ApplicationPassword, ({ value }) => ({
  properties: { value },
}));

sst.Linkable.wrap(aws.ec2.Eip, ({ publicIp }) => ({
  properties: { publicIp },
}));

sst.Linkable.wrap(tls.PrivateKey, ({ privateKeyPem }) => ({
  properties: { privateKeyPem },
}));

sst.Linkable.wrap(aws.cloudfront.PublicKey, ({ id, encodedKey }) => ({
  properties: { id, encodedKey },
}));

sst.Linkable.wrap(aws.cloudfront.Distribution, ({ domainName }) => ({
  properties: { domainName },
}));

export * from "./buckets";
export * from "./astro";
export * from "./cron";
export * from "./secrets";
export * from "./entra-id";
export * from "./vpc";
export * from "./papercut";
