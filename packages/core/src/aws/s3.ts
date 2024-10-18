import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  DeleteObjectCommandInput,
  GetObjectCommandInput,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import type { NanoId } from "../utils/shared";

type RequestPresigningArguments = Parameters<typeof getSignedUrl>[2];

export namespace S3 {
  export const Client = S3Client;
  export type Client = S3Client;

  export const buildObjectKey = (
    tenantId: NanoId,
    ...segments: Array<string>
  ) => `${tenantId}/${segments.join("/")}`;

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
