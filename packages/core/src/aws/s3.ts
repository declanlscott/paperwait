import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { AWS_REGION } from "../constants";
import { NotFoundError } from "../errors/http";

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
  region: AWS_REGION,
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
  try {
    await client.send(new DeleteObjectCommand(input));
  } catch (e) {
    if (e instanceof NoSuchKey) throw new NotFoundError("Object not found");

    throw e;
  }
}
