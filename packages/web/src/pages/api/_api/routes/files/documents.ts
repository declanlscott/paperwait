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
