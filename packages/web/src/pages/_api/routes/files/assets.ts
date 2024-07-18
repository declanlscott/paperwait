import {
  buildCloudfrontUrl,
  buildS3ObjectKey,
  getCloudfrontSignedUrl,
  getS3SignedPutUrl,
} from "@paperwait/core/aws";
import { ASSETS_MIME_TYPES } from "@paperwait/core/constants";
import { BadRequestError } from "@paperwait/core/errors";
import { validator } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";
import { Resource } from "sst";
import * as v from "valibot";

import { authorization, maxContentLength } from "~/api/middleware";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .get(
    "/signed-put-urls",
    authorization(["administrator", "operator"]),
    honoValidator(
      "query",
      validator(
        v.object({
          name: v.string(),
          metadata: v.object({
            contentType: v.picklist(ASSETS_MIME_TYPES),
            contentLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
          }),
        }),
        {
          Error: BadRequestError,
          message: "Invalid query parameters",
        },
      ),
    ),
    async (c, next) =>
      maxContentLength("assets", c.req.valid("query").metadata.contentLength)(
        c,
        next,
      ),
    async (c) => {
      const orgId = c.env.locals.org!.id;
      const { name, metadata } = c.req.valid("query");

      const signedUrl = await getS3SignedPutUrl({
        Bucket: Resource.AssetsBucket.name,
        Key: buildS3ObjectKey(orgId, name),
        ContentType: metadata.contentType,
        ContentLength: metadata.contentLength,
      });

      return c.json({ signedUrl });
    },
  )
  .get(
    "/signed-get-urls",
    honoValidator("query", validator(v.object({ name: v.string() }))),
    async (c) => {
      const orgId = c.env.locals.org!.id;
      const { name } = c.req.valid("query");

      const signedUrl = getCloudfrontSignedUrl({
        url: buildCloudfrontUrl(
          Resource.AssetsDistribution.domainName,
          buildS3ObjectKey(orgId, name),
        ),
        keyPairId: Resource.AssetsDistributionPublicKey.id,
        privateKey: Resource.AssetsDistributionPrivateKey.privateKeyPem,
        dateLessThan: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      });

      return c.json({ signedUrl });
    },
  );
