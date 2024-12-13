import { vValidator } from "@hono/valibot-validator";
import { Documents } from "@printworks/core/files/documents";
import { Hono } from "hono";
import * as v from "valibot";

import { ssmClient } from "~/api/middleware/aws";

export default new Hono()
  .put(
    "/mime-types",
    vValidator("json", v.object({ mimeTypes: v.array(v.string()) })),
    ssmClient("SetDocumentsMimeTypes"),
    async (c) => {
      await Documents.setMimeTypes(c.req.valid("json").mimeTypes);

      return c.body(null, 204);
    },
  )
  .get("/mime-types", async (c) => {
    const mimeTypes = await Documents.getMimeTypes();

    return c.json({ mimeTypes }, 200);
  })
  .put(
    "/size-limit",
    vValidator("json", v.object({ byteSize: v.number() })),
    ssmClient("SetDocumentsSizeLimit"),
    async (c) => {
      await Documents.setSizeLimit(c.req.valid("json").byteSize);

      return c.body(null, 204);
    },
  )
  .get("/size-limit", async (c) => {
    const byteSize = await Documents.getSizeLimit();

    return c.json({ byteSize }, 200);
  });
// .get(
//   "/signed-put-url",
//   vValidator(
//     "query",
//     v.object({
//       name: v.string(),
//       orderId: NanoId,
//       metadata: v.object({
//         contentType: v.string(),
//         contentLength: v.pipe(v.number(), v.integer(), v.minValue(0)),
//       }),
//     }),
//   ),
//   async (c, next) => {
//     const { tenant } = useAuthenticated();
//     const { metadata } = c.req.valid("query");

//     const documentsMimeTypes = await getSsmParameter({
//       Name: buildSsmParameterPath(
//         tenant.id,
//         DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
//       ),
//     }).then((value) => value.split(","));

//     if (!documentsMimeTypes.includes(metadata.contentType))
//       throw new BadRequestError("Invalid content type");

//     await next();
//   },
//   async (c, next) =>
//     maxContentLength(
//       "documents",
//       c.req.valid("query").metadata.contentLength,
//     )(c, next),
//   async (c) => {
//     const { tenant } = useAuthenticated();
//     const { name, orderId, metadata } = c.req.valid("query");

//     const signedUrl = await getS3SignedPutUrl({
//       Bucket: Resource.Storage.documents.bucket,
//       Key: buildS3ObjectKey(tenant.id, orderId, name),
//       ContentType: metadata.contentType,
//       ContentLength: metadata.contentLength,
//     });

//     return c.json({ signedUrl });
//   },
// )
// .get(
//   "/signed-get-url",
//   vValidator("query", v.object({ name: v.string(), orderId: NanoId })),
//   async (c, next) => {
//     const { orderId } = c.req.valid("query");

//     await serializable(() => requireAccessToOrder(orderId));

//     await next();
//   },
//   async (c) => {
//     const { tenant } = useAuthenticated();
//     const { name, orderId } = c.req.valid("query");

//     const signedUrl = await getS3SignedGetUrl({
//       Bucket: Resource.Storage.documents.bucket,
//       Key: buildS3ObjectKey(tenant.id, orderId, name),
//     });

//     return c.json({ signedUrl });
//   },
// )
// .delete(
//   "/",
//   vValidator("query", v.object({ name: v.string(), orderId: NanoId })),
//   async (c, next) => {
//     const { orderId } = c.req.valid("query");

//     await serializable(() => requireAccessToOrder(orderId));

//     await next();
//   },
//   async (c) => {
//     const { tenant } = useAuthenticated();
//     const { name, orderId } = c.req.valid("query");

//     await deleteS3Object({
//       Bucket: Resource.Storage.documents.bucket,
//       Key: buildS3ObjectKey(tenant.id, orderId, name),
//     });

//     return c.body(null, 204);
//   },
// );
