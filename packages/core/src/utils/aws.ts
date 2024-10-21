/**
 * NOTE: This module provides server utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import { Sha256 } from "@aws-crypto/sha256-js";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import {
  DeleteParameterCommand,
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { getSignedUrl as _getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SignatureV4 as _SignatureV4 } from "@smithy/signature-v4";

import type {
  DeleteObjectCommandInput,
  GetObjectCommandInput,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import type { SendMessageCommandInput } from "@aws-sdk/client-sqs";
import type {
  DeleteParameterCommandInput,
  GetParameterCommandInput,
  PutParameterCommandInput,
} from "@aws-sdk/client-ssm";
import type { AssumeRoleCommandInput, Credentials } from "@aws-sdk/client-sts";
import type { SignatureV4Init } from "@smithy/signature-v4";

export namespace Cloudfront {
  export const getSignedUrl = _getSignedUrl;

  export const buildUrl = (domainName: string, path: string) =>
    `https://${domainName}/${path}`;
}

export namespace S3 {
  type RequestPresigningArguments = Parameters<typeof getSignedUrl>[2];

  export const Client = S3Client;
  export type Client = S3Client;

  export const getSignedPutUrl = (
    client: S3Client,
    input: PutObjectCommandInput,
    args?: RequestPresigningArguments,
  ) => getSignedUrl(client, new PutObjectCommand(input), args);

  export const getSignedGetUrl = (
    client: S3Client,
    input: GetObjectCommandInput,
    args?: RequestPresigningArguments,
  ) => getSignedUrl(client, new GetObjectCommand(input), args);

  export async function deleteObject(
    client: S3Client,
    input: DeleteObjectCommandInput,
  ) {
    await client.send(new DeleteObjectCommand(input));
  }
}

export namespace SignatureV4 {
  interface BuildSignerProps
    extends Exclude<Partial<SignatureV4Init>, "region" | "service"> {
    region: SignatureV4Init["region"];
    service: SignatureV4Init["service"];
  }

  export const buildSigner = ({
    credentials = fromNodeProviderChain(),
    sha256 = Sha256,
    region,
    service,
  }: BuildSignerProps) =>
    new _SignatureV4({ credentials, sha256, region, service });
}

export namespace Sqs {
  export const Client = SQSClient;
  export type Client = SQSClient;

  export async function sendMessage(
    client: SQSClient,
    input: {
      [TKey in keyof SendMessageCommandInput]: NonNullable<
        SendMessageCommandInput[TKey]
      >;
    },
  ) {
    await client.send(new SendMessageCommand(input));
  }
}

export namespace Ssm {
  export const Client = SSMClient;
  export type Client = SSMClient;

  export async function putParameter(
    client: SSMClient,
    input: {
      [TKey in keyof PutParameterCommandInput]: NonNullable<
        PutParameterCommandInput[TKey]
      >;
    },
  ) {
    await client.send(new PutParameterCommand(input));
  }

  export async function getParameter(
    client: SSMClient,
    input: {
      [TKey in keyof GetParameterCommandInput]: NonNullable<
        GetParameterCommandInput[TKey]
      >;
    },
  ) {
    const { Parameter, $metadata } = await client.send(
      new GetParameterCommand(input),
    );
    if (!Parameter?.Value)
      throw new ParameterNotFound({
        message: "Parameter not found or has no value",
        $metadata,
      });

    return Parameter.Value;
  }

  export async function deleteParameter(
    client: SSMClient,
    input: {
      [TKey in keyof DeleteParameterCommandInput]: NonNullable<
        DeleteParameterCommandInput[TKey]
      >;
    },
  ) {
    await client.send(new DeleteParameterCommand(input));
  }
}

export namespace Sts {
  export const Client = STSClient;
  export type Client = STSClient;

  export type NonNullableCredentials = {
    [TKey in keyof Credentials]: NonNullable<Credentials[TKey]>;
  };

  export const assumeRole = async (
    client: STSClient,
    input: {
      [TKey in keyof AssumeRoleCommandInput]: NonNullable<
        AssumeRoleCommandInput[TKey]
      >;
    },
  ) => client.send(new AssumeRoleCommand(input));
}
