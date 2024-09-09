import { pgEnum } from "drizzle-orm/pg-core";

import { oauth2ProviderVariants } from "../oauth2/shared";
import { licenseStatuses, orgStatuses } from "../organizations/shared";
import { productStatuses } from "../products/shared";
import { roomStatuses } from "../rooms/shared";
import { userRoles } from "../users/shared";

export const licenseStatus = pgEnum("license_status", licenseStatuses);

export const oauth2ProviderVariant = pgEnum(
  "oauth2_provider_variant",
  oauth2ProviderVariants,
);

export const orgStatus = pgEnum("org_status", orgStatuses);

export const productStatus = pgEnum("product_status", productStatuses);

export const roomStatus = pgEnum("room_status", roomStatuses);

export const userRole = pgEnum("user_role", userRoles);
