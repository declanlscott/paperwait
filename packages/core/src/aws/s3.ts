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

export const buildS3ObjectKey = (orgId: NanoId, ...segments: Array<string>) =>
  `${orgId}/${segments.join("/")}`;

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: fromNodeProviderChain(),
});

export const getS3SignedPutUrl = (
  input: PutObjectCommandInput,
  args?: RequestPresigningArguments,
) => getSignedUrl(s3Client, new PutObjectCommand(input), args);

export const getS3SignedGetUrl = (
  input: GetObjectCommandInput,
  args?: RequestPresigningArguments,
) => getSignedUrl(s3Client, new GetObjectCommand(input), args);

export async function deleteS3Object(input: DeleteObjectCommandInput) {
  try {
    await s3Client.send(new DeleteObjectCommand(input));
  } catch (e) {
    if (e instanceof NoSuchKey) throw new NotFoundError("Object not found");

    throw e;
  }
}
