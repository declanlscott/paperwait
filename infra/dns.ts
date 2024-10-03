export const domainName = new sst.Secret("DomainName");

export const appFqdn =
  {
    production: domainName.value,
    dev: $interpolate`dev.${domainName.value}`,
  }[$app.stage] ?? $interpolate`${$app.stage}.dev.${domainName.value}`;
