import { Hono } from "hono";
import { Resource } from "sst";

export default new Hono().all("*", async (c) => {
  const res = await fetch(Resource.Web.url, c.req.raw);

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
});
