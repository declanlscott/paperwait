export const oAuth2ProviderVariants = ["entra-id", "google"] as const;
export type OAuth2ProviderVariant = (typeof oAuth2ProviderVariants)[number];
