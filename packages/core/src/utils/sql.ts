import { pgEnum } from "drizzle-orm/pg-core";

import { invoiceStatuses } from "../invoices/shared";
import { oauth2ProviderVariants } from "../oauth2/shared";
import { productStatuses } from "../products/shared";
import { roomStatuses } from "../rooms/shared";
import { licenseStatuses, tenantStatuses } from "../tenants/shared";
import { userRoles } from "../users/shared";

export const licenseStatus = pgEnum("license_status", licenseStatuses);

export const oauth2ProviderVariant = pgEnum(
  "oauth2_provider_variant",
  oauth2ProviderVariants,
);

export const tenantStatus = pgEnum("tenant_status", tenantStatuses);

export const productStatus = pgEnum("product_status", productStatuses);

export const roomStatus = pgEnum("room_status", roomStatuses);
export const invoiceStatus = pgEnum("invoice_status", invoiceStatuses);

export const userRole = pgEnum("user_role", userRoles);
