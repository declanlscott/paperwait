import { pgEnum } from "drizzle-orm/pg-core";

import { oAuth2ProviderVariants } from "../oauth2/shared";
import { orgStatuses } from "../organization/shared";
import { productStatuses } from "../product/shared";
import { roomStatuses } from "../room/shared";
import { userRoles } from "../user/shared";

export const licenseStatuses = ["active", "expired"] as const;
export type LicenseStatus = (typeof licenseStatuses)[number];
export const licenseStatus = pgEnum("license_status", licenseStatuses);

export const oAuth2ProviderVariant = pgEnum(
  "oauth2_provider_variant",
  oAuth2ProviderVariants,
);

export const orgStatus = pgEnum("org_status", orgStatuses);

export const productStatus = pgEnum("product_status", productStatuses);

export const roomStatus = pgEnum("room_status", roomStatuses);

export const userRole = pgEnum("user_role", userRoles);
