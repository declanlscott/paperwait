export { getSignedUrl } from "@aws-sdk/cloudfront-signer";

export const buildUrl = (domainName: string, path: string) =>
  `https://${domainName}/${path}`;
