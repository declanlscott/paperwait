import { getSignedUrl as _getSignedUrl } from "@aws-sdk/cloudfront-signer";

export namespace Cloudfront {
  export const getSignedUrl = _getSignedUrl;

  export const buildUrl = (domainName: string, path: string) =>
    `https://${domainName}/${path}`;
}
