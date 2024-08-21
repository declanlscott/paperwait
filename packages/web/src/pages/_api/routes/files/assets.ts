/* eslint-disable drizzle/enforce-delete-with-where */
import { vValidator } from "@hono/valibot-validator";
import { useAuthenticated } from "@paperwait/core/auth";
import {
  buildCloudfrontUrl,
  buildS3ObjectKey,
  deleteS3Object,
  getCloudfrontSignedUrl,
  getS3SignedPutUrl,
} from "@paperwait/core/aws";
import { ASSETS_MIME_TYPES } from "@paperwait/core/constants";
import { Hono } from "hono";
import sharp from "sharp";
import { Resource } from "sst";
import * as v from "valibot";

import { authorization, maxContentLength } from "~/api/middleware";

export default new Hono()
  .post(
    "/thumbnail",
    authorization(["administrator", "operator"]),
    vValidator(
      "form",
      v.object({ image: v.pipe(v.file(), v.mimeType(ASSETS_MIME_TYPES)) }),
    ),
    async (c, next) =>
      maxContentLength("assets", c.req.valid("form").image.size)(c, next),
    async (c) => {
      const image = c.req.valid("form").image;
      const buffer = await image.arrayBuffer();

      const thumbnail = await sharp(Buffer.from(buffer))
        .blur(1)
        .resize(10)
        .toBuffer();

      return c.body(thumbnail, 200, {
        "Content-Type": image.type,
        "Content-Length": thumbnail.byteLength.toString(),
      });
    },
  )
  .get(
    "/signed-put-url",
    authorization(["administrator", "operator"]),
    vValidator(
      "query",
      v.object({
        name: v.string(),
        metadata: v.object({
          contentType: v.picklist(ASSETS_MIME_TYPES),
          contentLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
        }),
      }),
    ),
    async (c, next) =>
      maxContentLength("assets", c.req.valid("query").metadata.contentLength)(
        c,
        next,
      ),
    async (c) => {
      const { org } = useAuthenticated();
      const { name, metadata } = c.req.valid("query");

      const signedUrl = await getS3SignedPutUrl({
        Bucket: Resource.Storage.assets.bucket,
        Key: buildS3ObjectKey(org.id, name),
        ContentType: metadata.contentType,
        ContentLength: metadata.contentLength,
      });

      return c.json({ signedUrl });
    },
  )
  .get(
    "/signed-get-url",
    vValidator("query", v.object({ name: v.string() })),
    async (c) => {
      const { org } = useAuthenticated();
      const { name } = c.req.valid("query");

      const signedUrl = getCloudfrontSignedUrl({
        url: buildCloudfrontUrl(
          Resource.Storage.assets.distribution.domain,
          buildS3ObjectKey(org.id, name),
        ),
        keyPairId: Resource.Storage.assets.distribution.publicKey.id,
        privateKey: Resource.Storage.assets.distribution.privateKey,
        dateLessThan: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      });

      return c.json({ signedUrl });
    },
  )
  .delete(
    "/",
    vValidator("query", v.object({ name: v.string() })),
    async (c) => {
      const { org } = useAuthenticated();
      const { name } = c.req.valid("query");

      await deleteS3Object({
        Bucket: Resource.AssetsBucket.name,
        Key: buildS3ObjectKey(org.id, name),
      });

      return c.body(null, 204);
    },
  );
