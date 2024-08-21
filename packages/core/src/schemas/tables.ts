import * as v from "valibot";

import { VARCHAR_LENGTH } from "../constants";
import { OAuth2ProviderVariant } from "../oauth2/provider.sql";
import { LicenseStatus, OrgStatus } from "../organization/organization.sql";
import { ProductStatus } from "../product/product.sql";
import { RoomStatus } from "../room/room.sql";
import { UserRole } from "../user/user.sql";
import { NanoId, PapercutAccountId } from "./id";
import { ProductConfiguration } from "./product-configuration";
import { RoomConfiguration } from "./room-configuration";

export const TimestampsSchema = v.object({
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  deletedAt: v.nullable(v.pipe(v.string(), v.isoTimestamp())),
});

export const OrgTableSchema = v.object({
  id: NanoId,
  orgId: NanoId,
  ...TimestampsSchema.entries,
});

export const AnnouncementSchema = v.object({
  ...OrgTableSchema.entries,
  content: v.string(),
  roomId: NanoId,
});

export const SessionSchema = v.object({
  id: NanoId,
  orgId: NanoId,
  userId: NanoId,
  expiresAt: v.date(),
});

export const SessionTokensSchema = v.object({
  sessionId: NanoId,
  userId: NanoId,
  orgId: NanoId,
  idToken: v.string(),
  accessToken: v.string(),
  accessTokenExpiresAt: v.date(),
  refreshToken: v.nullable(v.string()),
});

export const CommentSchema = v.object({
  ...OrgTableSchema.entries,
  orderId: NanoId,
  authorId: NanoId,
  content: v.string(),
  visibleTo: v.array(v.picklist(UserRole.enumValues)),
});

export const LicenseSchema = v.object({
  key: v.pipe(v.string(), v.uuid()),
  orgId: NanoId,
  status: v.picklist(LicenseStatus.enumValues),
});

export const OAuth2ProviderSchema = v.object({
  id: v.string(),
  orgId: NanoId,
  variant: v.picklist(OAuth2ProviderVariant.enumValues),
  ...TimestampsSchema.entries,
});

export const OrderSchema = v.object({
  ...OrgTableSchema.entries,
  customerId: NanoId,
  managerId: v.nullable(NanoId),
  operatorId: v.nullable(NanoId),
  productId: NanoId,
  papercutAccountId: PapercutAccountId,
});

export const OrganizationSchema = v.object({
  id: NanoId,
  slug: v.string(),
  name: v.string(),
  status: v.picklist(OrgStatus.enumValues),
  licenseKey: v.pipe(v.string(), v.uuid()),
  oAuth2ProviderId: v.nullable(v.string()),
  ...TimestampsSchema.entries,
});

export const PapercutAccountManagerAuthorizationSchema = v.object({
  ...OrgTableSchema.entries,
  managerId: NanoId,
  papercutAccountId: PapercutAccountId,
});

export const ProductSchema = v.object({
  ...OrgTableSchema.entries,
  name: v.pipe(v.string(), v.maxLength(VARCHAR_LENGTH)),
  status: v.picklist(ProductStatus.enumValues),
  roomId: NanoId,
  config: ProductConfiguration,
});

export const RoomSchema = v.object({
  ...OrgTableSchema.entries,
  name: v.pipe(v.string(), v.maxLength(VARCHAR_LENGTH)),
  status: v.picklist(RoomStatus.enumValues),
  details: v.nullable(v.string()),
  config: RoomConfiguration,
});

export const UserSchema = v.object({
  ...OrgTableSchema.entries,
  providerId: v.string(),
  role: v.picklist(UserRole.enumValues),
  name: v.string(),
  email: v.string(),
  username: v.string(),
});
