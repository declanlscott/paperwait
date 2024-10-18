import * as v from "valibot";

export const tailscaleOauthCredentialsSchema = v.object({
  id: v.string(),
  key: v.string(),
});
export type TailscaleOauthCredentials = v.InferOutput<
  typeof tailscaleOauthCredentialsSchema
>;

export const tailscaleAuthKeySchema = v.object({
  id: v.string(),
  key: v.string(),
});
export type TailscaleAuthKey = v.InferOutput<typeof tailscaleAuthKeySchema>;
