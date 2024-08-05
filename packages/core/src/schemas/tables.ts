import * as v from "valibot";

import { OrderStatus } from "../order/order.sql";
import { OrgStatus, Provider } from "../organization/organization.sql";
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

export const OrderSchema = v.object({
  ...OrgTableSchema.entries,
  customerId: NanoId,
  managerId: v.nullable(NanoId),
  operatorId: v.nullable(NanoId),
  productId: NanoId,
  papercutAccountId: PapercutAccountId,
  status: v.picklist(OrderStatus.enumValues),
});

export const OrganizationSchema = v.object({
  id: NanoId,
  slug: v.string(),
  name: v.string(),
  provider: v.picklist(Provider.enumValues),
  providerId: v.string(),
  status: v.picklist(OrgStatus.enumValues),
  ...TimestampsSchema.entries,
});

export const PapercutAccountManagerAuthorizationSchema = v.object({
  ...OrgTableSchema.entries,
  managerId: NanoId,
  papercutAccountId: PapercutAccountId,
});

export const ProductSchema = v.object({
  ...OrgTableSchema.entries,
  name: v.pipe(v.string(), v.maxLength(40)),
  status: v.picklist(ProductStatus.enumValues),
  roomId: NanoId,
  config: ProductConfiguration,
});

export const RoomSchema = v.object({
  ...OrgTableSchema.entries,
  name: v.pipe(v.string(), v.maxLength(40)),
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
