import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { SignatureV4 } from "@smithy/signature-v4";

import { AWS_REGION } from "../constants";

import type {
  SignatureV4CryptoInit,
  SignatureV4Init,
} from "@smithy/signature-v4";

interface BuildSignerProps
  extends Omit<SignatureV4Init, "credentials" | "region">,
    Omit<SignatureV4CryptoInit, "sha256"> {
  credentials?: SignatureV4Init["credentials"];
  region?: SignatureV4Init["region"];
  sha256?: SignatureV4CryptoInit["sha256"];
}

export function buildSigner({
  credentials = fromNodeProviderChain(),
  region = AWS_REGION,
  sha256 = Sha256,
  service,
}: BuildSignerProps) {
  return new SignatureV4({ credentials, sha256, region, service });
}
