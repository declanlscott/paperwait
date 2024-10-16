import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { SignatureV4 as _SignatureV4 } from "@smithy/signature-v4";
import { Resource } from "sst";

import type { SignatureV4Init } from "@smithy/signature-v4";

export namespace SignatureV4 {
  interface BuildSignerProps
    extends Exclude<Partial<SignatureV4Init>, "service"> {
    service: SignatureV4Init["service"];
  }

  export const buildSigner = ({
    region = Resource.Cloud.aws.region,
    sha256 = Sha256,
    credentials = fromNodeProviderChain(),
    service,
  }: BuildSignerProps) =>
    new _SignatureV4({ credentials, sha256, region, service });
}
