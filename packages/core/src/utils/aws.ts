/**
 * NOTE: This module provides server utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import { Sha256 } from "@aws-crypto/sha256-js";
import {
  AppSyncClient,
  AssociateApiCommand,
  CreateApiCommand,
  CreateApiKeyCommand,
  CreateChannelNamespaceCommand,
  CreateDomainNameCommand,
  DeleteApiCommand,
  DeleteApiKeyCommand,
  DeleteChannelNamespaceCommand,
  DeleteDomainNameCommand,
  DisassociateApiCommand,
  GetApiAssociationCommand,
  GetApiCommand,
  GetChannelNamespaceCommand,
  GetDomainNameCommand,
  ListApiKeysCommand,
  UpdateApiCommand,
  UpdateApiKeyCommand,
  UpdateChannelNamespaceCommand,
  UpdateDomainNameCommand,
} from "@aws-sdk/client-appsync";
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
import { getSignedUrl as _getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SignatureV4 as _SignatureV4 } from "@smithy/signature-v4";

import { Utils } from ".";
import { HttpError } from "./errors";

import type {
  AssociateApiCommandInput,
  CreateApiCommandInput,
  CreateApiKeyCommandInput,
  CreateChannelNamespaceCommandInput,
  CreateDomainNameCommandInput,
  DeleteApiCommandInput,
  DeleteApiKeyCommandInput,
  DeleteChannelNamespaceCommandInput,
  DeleteDomainNameCommandInput,
  DisassociateApiCommandInput,
  GetApiAssociationCommandInput,
  GetApiCommandInput,
  GetChannelNamespaceCommandInput,
  GetDomainNameCommandInput,
  ListApiKeysCommandInput,
  UpdateApiCommandInput,
  UpdateApiKeyCommandInput,
  UpdateChannelNamespaceCommandInput,
  UpdateDomainNameCommandInput,
} from "@aws-sdk/client-appsync";
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
import type { SignatureV4Init } from "@smithy/signature-v4";

type CommandInput<TCommandInput> = {
  [TKey in keyof TCommandInput]: NonNullable<TCommandInput[TKey]>;
};

export namespace Appsync {
  export const Client = AppSyncClient;
  export type Client = AppSyncClient;

  export const createApi = async (
    client: Client,
    input: CommandInput<CreateApiCommandInput>,
  ) => client.send(new CreateApiCommand(input));

  export const getApi = async (
    client: Client,
    input: CommandInput<GetApiCommandInput>,
  ) => client.send(new GetApiCommand(input));

  export const updateApi = async (
    client: Client,
    input: CommandInput<UpdateApiCommandInput>,
  ) => client.send(new UpdateApiCommand(input));

  export const deleteApi = async (
    client: Client,
    input: CommandInput<DeleteApiCommandInput>,
  ) => client.send(new DeleteApiCommand(input));

  export const createDomainName = async (
    client: Client,
    input: CommandInput<CreateDomainNameCommandInput>,
  ) => client.send(new CreateDomainNameCommand(input));

  export const getDomainName = async (
    client: Client,
    input: CommandInput<GetDomainNameCommandInput>,
  ) => client.send(new GetDomainNameCommand(input));

  export const updateDomainName = async (
    client: Client,
    input: CommandInput<UpdateDomainNameCommandInput>,
  ) => client.send(new UpdateDomainNameCommand(input));

  export const deleteDomainName = async (
    client: Client,
    input: CommandInput<DeleteDomainNameCommandInput>,
  ) => client.send(new DeleteDomainNameCommand(input));

  export const associateApi = async (
    client: Client,
    input: CommandInput<AssociateApiCommandInput>,
  ) => client.send(new AssociateApiCommand(input));

  export const getApiAssociation = async (
    client: Client,
    input: CommandInput<GetApiAssociationCommandInput>,
  ) => client.send(new GetApiAssociationCommand(input));

  export const disassociateApi = async (
    client: Client,
    input: CommandInput<DisassociateApiCommandInput>,
  ) => client.send(new DisassociateApiCommand(input));

  export const createChannelNamespace = async (
    client: Client,
    input: CommandInput<CreateChannelNamespaceCommandInput>,
  ) => client.send(new CreateChannelNamespaceCommand(input));

  export const getChannelNamespace = async (
    client: Client,
    input: CommandInput<GetChannelNamespaceCommandInput>,
  ) => client.send(new GetChannelNamespaceCommand(input));

  export const updateChannelNamespace = async (
    client: Client,
    input: CommandInput<UpdateChannelNamespaceCommandInput>,
  ) => client.send(new UpdateChannelNamespaceCommand(input));

  export const deleteChannelNamespace = async (
    client: Client,
    input: CommandInput<DeleteChannelNamespaceCommandInput>,
  ) => client.send(new DeleteChannelNamespaceCommand(input));

  export const createApiKey = async (
    client: Client,
    input: CommandInput<CreateApiKeyCommandInput>,
  ) => client.send(new CreateApiKeyCommand(input));

  export const updateApiKey = async (
    client: Client,
    input: CommandInput<UpdateApiKeyCommandInput>,
  ) => client.send(new UpdateApiKeyCommand(input));

  export const listApiKeys = async (
    client: Client,
    input: CommandInput<ListApiKeysCommandInput>,
  ) => client.send(new ListApiKeysCommand(input));

  export const deleteApiKey = async (
    client: Client,
    input: CommandInput<DeleteApiKeyCommandInput>,
  ) => client.send(new DeleteApiKeyCommand(input));
}

export namespace Cloudfront {
  export const buildUrl = (fqdn: string, pathSegments: Array<string>) =>
    `https://${fqdn}/${pathSegments.join("/")}`;

  export async function getKeyPairId(tenantFqdn: string) {
    const res = await fetch(
      buildUrl(tenantFqdn, [
        ".well-known",
        "appspecific",
        `${Utils.reverseDns(tenantFqdn)}.cloudfront-key-pair-id.txt`,
      ]),
      { method: "GET" },
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return res.text();
  }

  export const getSignedUrl = _getSignedUrl;
}

export namespace S3 {
  type RequestPresigningArguments = Parameters<typeof getSignedUrl>[2];

  export const Client = S3Client;
  export type Client = S3Client;

  export const getSignedPutUrl = (
    client: Client,
    input: CommandInput<PutObjectCommandInput>,
    args?: RequestPresigningArguments,
  ) => getSignedUrl(client, new PutObjectCommand(input), args);

  export const getSignedGetUrl = (
    client: Client,
    input: CommandInput<GetObjectCommandInput>,
    args?: RequestPresigningArguments,
  ) => getSignedUrl(client, new GetObjectCommand(input), args);

  export const deleteObject = async (
    client: Client,
    input: CommandInput<DeleteObjectCommandInput>,
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
    input: CommandInput<SendMessageCommandInput>,
  ) => client.send(new SendMessageCommand(input));
}

export namespace Ssm {
  export const Client = SSMClient;
  export type Client = SSMClient;

  export const putParameter = async (
    client: Client,
    input: CommandInput<PutParameterCommandInput>,
  ) => client.send(new PutParameterCommand(input));

  export async function getParameter(
    client: Client,
    input: CommandInput<GetParameterCommandInput>,
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

  export const deleteParameter = async (
    client: Client,
    input: CommandInput<DeleteParameterCommandInput>,
  ) => client.send(new DeleteParameterCommand(input));
}
