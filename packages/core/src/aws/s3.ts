import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Resource } from "sst";

import type {
  DeleteObjectCommandInput,
  GetObjectCommandInput,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import type { NanoId } from "../utils/schemas";

type RequestPresigningArguments = Parameters<typeof getSignedUrl>[2];

export const buildObjectKey = (orgId: NanoId, ...segments: Array<string>) =>
  `${orgId}/${segments.join("/")}`;

export const client = new S3Client({
  region: Resource.Meta.awsRegion,
  credentials: fromNodeProviderChain(),
});

export const getSignedPutUrl = (
  input: PutObjectCommandInput,
  args?: RequestPresigningArguments,
) => getSignedUrl(client, new PutObjectCommand(input), args);

export const getSignedGetUrl = (
  input: GetObjectCommandInput,
  args?: RequestPresigningArguments,
) => getSignedUrl(client, new GetObjectCommand(input), args);

export async function deleteObject(input: DeleteObjectCommandInput) {
  await client.send(new DeleteObjectCommand(input));
}
