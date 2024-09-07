export { getSignedUrl as getCloudfrontSignedUrl } from "@aws-sdk/cloudfront-signer";

export const buildUrl = (domainName: string, path: string) =>
  `https://${domainName}/${path}`;
