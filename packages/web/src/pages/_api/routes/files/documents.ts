import { Hono } from "hono";

// eslint-disable-next-line drizzle/enforce-delete-with-where
export default new Hono();
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
//     const { org } = useAuthenticated();
//     const { metadata } = c.req.valid("query");

//     const documentsMimeTypes = await getSsmParameter({
//       Name: buildSsmParameterPath(
//         org.id,
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
//     const { org } = useAuthenticated();
//     const { name, orderId, metadata } = c.req.valid("query");

//     const signedUrl = await getS3SignedPutUrl({
//       Bucket: Resource.Storage.documents.bucket,
//       Key: buildS3ObjectKey(org.id, orderId, name),
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
//     const { org } = useAuthenticated();
//     const { name, orderId } = c.req.valid("query");

//     const signedUrl = await getS3SignedGetUrl({
//       Bucket: Resource.Storage.documents.bucket,
//       Key: buildS3ObjectKey(org.id, orderId, name),
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
//     const { org } = useAuthenticated();
//     const { name, orderId } = c.req.valid("query");

//     await deleteS3Object({
//       Bucket: Resource.Storage.documents.bucket,
//       Key: buildS3ObjectKey(org.id, orderId, name),
//     });

//     return c.body(null, 204);
//   },
// );
