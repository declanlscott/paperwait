import { object, parse, string } from "valibot";

export default parse(
  object({
    AWS_ORG_NAME: string(),
    // CLOUDFLARE_ACCOUNT_ID: string(),
    // CLOUDFLARE_ZONE_ID: string(),
  }),
  process.env,
);
