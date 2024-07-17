import { getCloudfrontSignedUrl } from "@paperwait/core/aws";
import { validator } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";
import { Resource } from "sst";
import * as v from "valibot";

import { authorization } from "~/api/middleware";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .get(
    "/signed-put-urls",
    authorization(["administrator", "operator"]),
    async () => {
      // TODO: Implement signed PUT URLs
    },
  )
  .get(
    "/signed-get-urls",
    honoValidator("query", validator(v.object({ name: v.string() }))),
    async (c) => {
      const signedUrl = getCloudfrontSignedUrl({
        url: `https://${Resource.AssetsDistribution.domainName}/${c.env.locals.org!.id}/${c.req.valid("query").name}`,
        keyPairId: Resource.AssetsDistributionPublicKey.id,
        privateKey: Resource.AssetsDistributionPrivateKey.privateKeyPem,
        dateLessThan: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      });

      return c.json({ signedUrl });
    },
  );
