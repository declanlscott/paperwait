/**
 * NOTE: This module provides server utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import { Sha256 } from "@aws-crypto/sha256-js";
import {
  AppSyncClient,
  CreateApiCommand,
  CreateChannelNamespaceCommand,
  DeleteApiCommand,
  DeleteChannelNamespaceCommand,
  GetApiCommand,
  GetChannelNamespaceCommand,
  UpdateApiCommand,
  UpdateChannelNamespaceCommand,
} from "@aws-sdk/client-appsync";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  SendMessageBatchCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
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
  CreateApiCommandInput,
  CreateChannelNamespaceCommandInput,
  DeleteApiCommandInput,
  DeleteChannelNamespaceCommandInput,
  GetApiCommandInput,
  GetChannelNamespaceCommandInput,
  UpdateApiCommandInput,
  UpdateChannelNamespaceCommandInput,
} from "@aws-sdk/client-appsync";
import type {
  DeleteObjectCommandInput,
  GetObjectCommandInput,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import type {
  SendMessageBatchCommandInput,
  SendMessageCommandInput,
} from "@aws-sdk/client-sqs";
import type {
  DeleteParameterCommandInput,
  GetParameterCommandInput,
  PutParameterCommandInput,
} from "@aws-sdk/client-ssm";
import type { AssumeRoleCommandInput, Credentials } from "@aws-sdk/client-sts";
import type { SignatureV4Init } from "@smithy/signature-v4";
import type { NonNullableProperties, StartsWith } from "./types";

export namespace Appsync {
  export const Client = AppSyncClient;
  export type Client = AppSyncClient;

  export const createApi = async (
    client: Client,
    input: NonNullableProperties<CreateApiCommandInput>,
  ) => client.send(new CreateApiCommand(input));

  export const getApi = async (
    client: Client,
    input: NonNullableProperties<GetApiCommandInput>,
  ) => client.send(new GetApiCommand(input));

  export const updateApi = async (
    client: Client,
    input: NonNullableProperties<UpdateApiCommandInput>,
  ) => client.send(new UpdateApiCommand(input));

  export const deleteApi = async (
    client: Client,
    input: NonNullableProperties<DeleteApiCommandInput>,
  ) => client.send(new DeleteApiCommand(input));

  export const createChannelNamespace = async (
    client: Client,
    input: NonNullableProperties<CreateChannelNamespaceCommandInput>,
  ) => client.send(new CreateChannelNamespaceCommand(input));

  export const getChannelNamespace = async (
    client: Client,
    input: NonNullableProperties<GetChannelNamespaceCommandInput>,
  ) => client.send(new GetChannelNamespaceCommand(input));

  export const updateChannelNamespace = async (
    client: Client,
    input: NonNullableProperties<UpdateChannelNamespaceCommandInput>,
  ) => client.send(new UpdateChannelNamespaceCommand(input));

  export const deleteChannelNamespace = async (
    client: Client,
    input: NonNullableProperties<DeleteChannelNamespaceCommandInput>,
  ) => client.send(new DeleteChannelNamespaceCommand(input));
}

export namespace Cloudfront {
  export const buildUrl = <TPath extends string>({
    protocol = "https",
    fqdn,
    path,
  }: {
    protocol?: string;
    fqdn: string;
    path: StartsWith<"/", TPath>;
  }) => new URL(`${protocol}://${fqdn}${path}`);

  export const getSignedUrl = (...args: Parameters<typeof _getSignedUrl>) =>
    new URL(_getSignedUrl(...args));
}

export namespace S3 {
  type RequestPresigningArguments = Parameters<typeof getSignedUrl>[2];

  export const Client = S3Client;
  export type Client = S3Client;

  export const getSignedPutUrl = (
    client: Client,
    input: NonNullableProperties<PutObjectCommandInput>,
    args?: RequestPresigningArguments,
  ) => getSignedUrl(client, new PutObjectCommand(input), args);

  export const getSignedGetUrl = (
    client: Client,
    input: NonNullableProperties<GetObjectCommandInput>,
    args?: RequestPresigningArguments,
  ) => getSignedUrl(client, new GetObjectCommand(input), args);

  export const deleteObject = async (
    client: Client,
    input: NonNullableProperties<DeleteObjectCommandInput>,
  ) => client.send(new DeleteObjectCommand(input));
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

  export const sendMessage = async (
    client: Client,
    input: NonNullableProperties<SendMessageCommandInput>,
  ) => client.send(new SendMessageCommand(input));

  export const sendMessageBatch = async (
    client: Client,
    input: NonNullableProperties<SendMessageBatchCommandInput>,
  ) => client.send(new SendMessageBatchCommand(input));
}

export namespace Ssm {
  export const Client = SSMClient;
  export type Client = SSMClient;

  export const putParameter = async (
    client: Client,
    input: NonNullableProperties<PutParameterCommandInput>,
  ) => client.send(new PutParameterCommand(input));

  export async function getParameter(
    client: Client,
    input: NonNullableProperties<GetParameterCommandInput>,
  ) {
    const { Parameter, $metadata } = await client.send(
      new GetParameterCommand(input),
    );
    if (!Parameter?.Value)
      throw new ParameterNotFound({
        message: `Parameter of name "${input.Name}" not found or has no value`,
        $metadata,
      });

    return Parameter.Value;
  }

  export const deleteParameter = async (
    client: Client,
    input: NonNullableProperties<DeleteParameterCommandInput>,
  ) => client.send(new DeleteParameterCommand(input));
}

export namespace Sts {
  export const Client = STSClient;
  export type Client = STSClient;

  export type NonNullableCredentials = NonNullableProperties<Credentials>;

  export const assumeRole = async (
    client: Client,
    input: NonNullableProperties<AssumeRoleCommandInput>,
  ) => client.send(new AssumeRoleCommand(input));
}
