/* eslint-disable drizzle/enforce-delete-with-where */
import {
  buildS3ObjectKey,
  buildSsmParameterPath,
  deleteS3Object,
  getS3SignedGetUrl,
  getS3SignedPutUrl,
  getSsmParameter,
} from "@paperwait/core/aws";
import { DOCUMENTS_MIME_TYPES_PARAMETER_NAME } from "@paperwait/core/constants";
import { requireAccessToOrder } from "@paperwait/core/data";
import { serializable } from "@paperwait/core/database";
import { BadRequestError } from "@paperwait/core/errors";
import { NanoId } from "@paperwait/core/schemas";
import { validator } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";
import { Resource } from "sst";
import * as v from "valibot";

import { maxContentLength } from "~/api/middleware";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .get(
    "/signed-put-url",
    honoValidator(
      "query",
      validator(
        v.object({
          name: v.string(),
          orderId: NanoId,
          metadata: v.object({
            contentType: v.string(),
            contentLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
          }),
        }),
        {
          Error: BadRequestError,
          message: "Invalid query parameters",
        },
      ),
    ),
    async (c, next) => {
      const orgId = c.env.locals.org!.id;
      const { metadata } = c.req.valid("query");

      const documentsMimeTypes = await getSsmParameter({
        Name: buildSsmParameterPath(orgId, DOCUMENTS_MIME_TYPES_PARAMETER_NAME),
      }).then((value) => value.split(","));

      if (!documentsMimeTypes.includes(metadata.contentType))
        throw new BadRequestError("Invalid content type");

      await next();
    },
    async (c, next) =>
      maxContentLength(
        "documents",
        c.req.valid("query").metadata.contentLength,
      )(c, next),
    async (c) => {
      const orgId = c.env.locals.org!.id;
      const { name, orderId, metadata } = c.req.valid("query");

      const signedUrl = await getS3SignedPutUrl({
        Bucket: Resource.DocumentsBucket.name,
        Key: buildS3ObjectKey(orgId, orderId, name),
        ContentType: metadata.contentType,
        ContentLength: metadata.contentLength,
      });

      return c.json({ signedUrl });
    },
  )
  .get(
    "/signed-get-url",
    honoValidator(
      "query",
      validator(v.object({ name: v.string(), orderId: NanoId }), {
        Error: BadRequestError,
        message: "Invalid query parameters",
      }),
    ),
    async (c, next) => {
      const { orderId } = c.req.valid("query");

      await serializable(async (tx) => {
        await requireAccessToOrder(tx, c.env.locals.user!, orderId);
      });

      await next();
    },
    async (c) => {
      const orgId = c.env.locals.org!.id;
      const { name, orderId } = c.req.valid("query");

      const signedUrl = await getS3SignedGetUrl({
        Bucket: Resource.DocumentsBucket.name,
        Key: buildS3ObjectKey(orgId, orderId, name),
      });

      return c.json({ signedUrl });
    },
  )
  .delete(
    "/",
    honoValidator(
      "query",
      validator(v.object({ name: v.string(), orderId: NanoId })),
    ),
    async (c, next) => {
      const { orderId } = c.req.valid("query");

      await serializable((tx) =>
        requireAccessToOrder(tx, c.env.locals.user!, orderId),
      );

      await next();
    },
    async (c) => {
      const orgId = c.env.locals.org!.id;
      const { name, orderId } = c.req.valid("query");

      await deleteS3Object({
        Bucket: Resource.DocumentsBucket.name,
        Key: buildS3ObjectKey(orgId, orderId, name),
      });

      return c.body(null, 204);
    },
  );
