import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  DeleteObjectCommandInput,
  GetObjectCommandInput,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import type { NanoId } from "../utils/shared";

type RequestPresigningArguments = Parameters<typeof getSignedUrl>[2];

export { S3Client as Client } from "@aws-sdk/client-s3";

export const buildObjectKey = (tenantId: NanoId, ...segments: Array<string>) =>
  `${tenantId}/${segments.join("/")}`;

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
