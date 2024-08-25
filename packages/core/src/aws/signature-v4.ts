import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { SignatureV4 } from "@smithy/signature-v4";

import { AWS_REGION } from "../constants/misc";

import type { SignatureV4Init } from "@smithy/signature-v4";

interface BuildSignerProps
  extends Exclude<Partial<SignatureV4Init>, "service"> {
  service: SignatureV4Init["service"];
}

export const buildSigner = ({
  credentials = fromNodeProviderChain(),
  region = AWS_REGION,
  sha256 = Sha256,
  service,
}: BuildSignerProps) =>
  new SignatureV4({ credentials, sha256, region, service });

export const apiGatewaySigner = buildSigner({ service: "execute-api" });
