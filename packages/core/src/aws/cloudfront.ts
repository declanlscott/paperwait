export { getSignedUrl as getCloudfrontSignedUrl } from "@aws-sdk/cloudfront-signer";

export const buildCloudfrontUrl = (domainName: string, path: string) =>
  `https://${domainName}/${path}`;
