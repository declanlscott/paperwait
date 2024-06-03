import { and, eq } from "drizzle-orm";

import { Announcement } from "../announcement/announcement.sql";
import { Comment } from "../comment/comment.sql";
import { ApplicationError } from "../errors/application";
import { Order } from "../order/order.sql";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import { formatChannel } from "../realtime";
import {
  getUsersByRoles,
  getUsersWithAccessToOrder,
  requireAccessToOrder,
} from "../replicache/data";
import { Room } from "../room/room.sql";
import { assertRole } from "../user/assert";
import { User } from "../user/user.sql";
import { globalPermissions } from "./schemas";

import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type {
  CreateAnnouncementMutationArgs,
  CreateCommentMutationArgs,
  CreateOrderMutationArgs,
  CreatePapercutAccountManagerAuthorizationMutationArgs,
  CreateProductMutationArgs,
  CreateRoomMutationArgs,
  DeleteAnnouncementMutationArgs,
  DeleteCommentMutationArgs,
  DeleteOrderMutationArgs,
  DeletePapercutAccountManagerAuthorizationMutationArgs,
  DeletePapercutAccountMutationArgs,
  DeleteProductMutationArgs,
  DeleteRoomMutationArgs,
  DeleteUserMutationArgs,
  UpdateAnnouncementMutationArgs,
  UpdateCommentMutationArgs,
  UpdateOrderMutationArgs,
  UpdateProductMutationArgs,
  UpdateRoomMutationArgs,
  UpdateUserRoleMutationArgs,
} from "./schemas";

async function updateUserRole(
  tx: Transaction,
  user: LuciaUser,
  { id: userId, ...args }: UpdateUserRoleMutationArgs,
) {
  assertRole(user, globalPermissions.updateUserRole);

  await tx
    .update(User)
    .set(args)
    .where(and(eq(User.id, userId), eq(User.orgId, user.orgId)));

  return [formatChannel("org", user.orgId)];
}

async function deleteUser(
  tx: Transaction,
  user: LuciaUser,
  { id: userId, ...args }: DeleteUserMutationArgs,
) {
  assertRole(user, globalPermissions.deleteUser);

  await tx
    .update(User)
    .set(args)
    .where(and(eq(User.id, userId), eq(User.orgId, user.orgId)));

  return [formatChannel("org", user.orgId)];
}

async function deletePapercutAccount(
  tx: Transaction,
  user: LuciaUser,
  { id: papercutAccountId, ...args }: DeletePapercutAccountMutationArgs,
) {
  assertRole(user, globalPermissions.deletePapercutAccount);

  const [adminsOps, managers, customers] = await Promise.all([
    getUsersByRoles(tx, user.orgId, ["administrator", "operator"]),
    tx
      .select({ managerId: PapercutAccountManagerAuthorization.managerId })
      .from(PapercutAccountManagerAuthorization)
      .where(
        and(
          eq(
            PapercutAccountManagerAuthorization.papercutAccountId,
            papercutAccountId,
          ),
          eq(PapercutAccountManagerAuthorization.orgId, user.orgId),
        ),
      ),
    tx
      .select({ customerId: PapercutAccountCustomerAuthorization.customerId })
      .from(PapercutAccountCustomerAuthorization)
      .where(
        and(
          eq(
            PapercutAccountCustomerAuthorization.papercutAccountId,
            papercutAccountId,
          ),
          eq(PapercutAccountCustomerAuthorization.orgId, user.orgId),
        ),
      ),
    tx
      .update(PapercutAccount)
      .set(args)
      .where(
        and(
          eq(PapercutAccount.id, papercutAccountId),
          eq(PapercutAccount.orgId, user.orgId),
        ),
      ),
  ]);

  return [
    ...adminsOps.map(({ id }) => formatChannel("user", id)),
    ...customers.map(({ customerId }) => formatChannel("user", customerId)),
    ...managers.map(({ managerId }) => formatChannel("user", managerId)),
  ];
}

async function createPapercutAccountManagerAuthorization(
  tx: Transaction,
  user: LuciaUser,
  args: CreatePapercutAccountManagerAuthorizationMutationArgs,
) {
  assertRole(user, globalPermissions.createPapercutAccountManagerAuthorization);

  const [managerAuthorization] = await tx
    .insert(PapercutAccountManagerAuthorization)
    .values(args)
    .onConflictDoNothing()
    .returning({ id: PapercutAccountManagerAuthorization.id });

  if (!managerAuthorization) return [];

  return [formatChannel("org", user.orgId)];
}

async function deletePapercutAccountManagerAuthorization(
  tx: Transaction,
  user: LuciaUser,
  {
    id: papercutAccountManagerAuthorizationId,
    ...args
  }: DeletePapercutAccountManagerAuthorizationMutationArgs,
) {
  assertRole(user, globalPermissions.deletePapercutAccountManagerAuthorization);

  await tx
    .update(PapercutAccountManagerAuthorization)
    .set(args)
    .where(
      and(
        eq(
          PapercutAccountManagerAuthorization.id,
          papercutAccountManagerAuthorizationId,
        ),
        eq(PapercutAccountManagerAuthorization.orgId, user.orgId),
      ),
    );

  return [formatChannel("org", user.orgId)];
}

async function createRoom(
  tx: Transaction,
  user: LuciaUser,
  args: CreateRoomMutationArgs,
) {
  assertRole(user, globalPermissions.createRoom);

  const [room] = await tx
    .insert(Room)
    .values(args)
    .onConflictDoNothing()
    .returning({ id: Room.id });
  if (!room) return [];

  return [formatChannel("org", user.orgId)];
}

async function updateRoom(
  tx: Transaction,
  user: LuciaUser,
  { id: roomId, ...args }: UpdateRoomMutationArgs,
) {
  assertRole(user, globalPermissions.updateRoom);

  await tx
    .update(Room)
    .set(args)
    .where(and(eq(Room.id, roomId), eq(Room.orgId, user.orgId)));

  return [formatChannel("org", user.orgId)];
}

async function deleteRoom(
  tx: Transaction,
  user: LuciaUser,
  { id: roomId, ...args }: DeleteRoomMutationArgs,
) {
  assertRole(user, globalPermissions.deleteRoom);

  await tx
    .update(Room)
    .set(args)
    .where(and(eq(Room.id, roomId), eq(Room.orgId, user.orgId)));

  return [formatChannel("org", user.orgId)];
}

async function createAnnouncement(
  tx: Transaction,
  user: LuciaUser,
  args: CreateAnnouncementMutationArgs,
) {
  assertRole(user, globalPermissions.createAnnouncement);

  await tx.insert(Announcement).values(args);

  return [formatChannel("org", user.orgId)];
}

async function updateAnnouncement(
  tx: Transaction,
  user: LuciaUser,
  { id: announcementId, ...args }: UpdateAnnouncementMutationArgs,
) {
  assertRole(user, globalPermissions.updateAnnouncement);

  await tx
    .update(Announcement)
    .set(args)
    .where(
      and(
        eq(Announcement.id, announcementId),
        eq(Announcement.orgId, user.orgId),
      ),
    );

  return [formatChannel("org", user.orgId)];
}

async function deleteAnnouncement(
  tx: Transaction,
  user: LuciaUser,
  { id: announcementId, ...args }: DeleteAnnouncementMutationArgs,
) {
  assertRole(user, globalPermissions.deleteAnnouncement);

  await tx
    .update(Announcement)
    .set(args)
    .where(
      and(
        eq(Announcement.id, announcementId),
        eq(Announcement.orgId, user.orgId),
      ),
    );

  return [formatChannel("org", user.orgId)];
}

async function createProduct(
  tx: Transaction,
  user: LuciaUser,
  args: CreateProductMutationArgs,
) {
  assertRole(user, globalPermissions.createProduct);

  await tx.insert(Product).values(args);

  return [formatChannel("org", user.orgId)];
}

async function updateProduct(
  tx: Transaction,
  user: LuciaUser,
  { id: productId, ...args }: UpdateProductMutationArgs,
) {
  assertRole(user, globalPermissions.updateProduct);

  await tx
    .update(Product)
    .set(args)
    .where(and(eq(Product.id, productId), eq(Product.orgId, user.orgId)));

  return [formatChannel("org", user.orgId)];
}

async function deleteProduct(
  tx: Transaction,
  user: LuciaUser,
  { id: productId, ...args }: DeleteProductMutationArgs,
) {
  assertRole(user, globalPermissions.deleteProduct);

  await tx
    .update(Product)
    .set(args)
    .where(and(eq(Product.id, productId), eq(Product.orgId, user.orgId)));

  return [formatChannel("org", user.orgId)];
}

async function createOrder(
  tx: Transaction,
  user: LuciaUser,
  args: CreateOrderMutationArgs,
) {
  assertRole(user, globalPermissions.createOrder);

  const [order] = await tx
    .insert(Order)
    .values(args)
    .returning({ id: Order.id });

  const users = await getUsersWithAccessToOrder(tx, order.id, user.orgId);

  return users.map(({ id }) => formatChannel("user", id));
}

async function updateOrder(
  tx: Transaction,
  user: LuciaUser,
  { id: orderId, ...args }: UpdateOrderMutationArgs,
) {
  let users: Awaited<ReturnType<typeof requireAccessToOrder>>;
  try {
    assertRole(user, globalPermissions.updateOrder);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;
  } finally {
    users = await requireAccessToOrder(tx, user, orderId);
  }

  await tx
    .update(Order)
    .set(args)
    .where(and(eq(Order.id, orderId), eq(Order.orgId, user.orgId)));

  return users.map(({ id }) => formatChannel("user", id));
}

async function deleteOrder(
  tx: Transaction,
  user: LuciaUser,
  { id: orderId, ...args }: DeleteOrderMutationArgs,
) {
  let users: Awaited<ReturnType<typeof requireAccessToOrder>>;
  try {
    assertRole(user, globalPermissions.updateOrder);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;
  } finally {
    users = await requireAccessToOrder(tx, user, orderId);
  }

  await tx
    .update(Order)
    .set(args)
    .where(and(eq(Order.id, orderId), eq(Order.orgId, user.orgId)));

  return users.map(({ id }) => formatChannel("user", id));
}

async function createComment(
  tx: Transaction,
  user: LuciaUser,
  args: CreateCommentMutationArgs,
) {
  let users: Awaited<ReturnType<typeof requireAccessToOrder>>;
  try {
    assertRole(user, globalPermissions.updateOrder);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;
  } finally {
    users = await requireAccessToOrder(tx, user, args.orderId);
  }

  await tx.insert(Comment).values(args);

  return users.map(({ id }) => formatChannel("user", id));
}

async function updateComment(
  tx: Transaction,
  user: LuciaUser,
  { id: commentId, ...args }: UpdateCommentMutationArgs,
) {
  let users: Awaited<ReturnType<typeof requireAccessToOrder>>;
  try {
    assertRole(user, globalPermissions.updateOrder);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;
  } finally {
    users = await requireAccessToOrder(tx, user, args.orderId);
  }

  await tx
    .update(Comment)
    .set(args)
    .where(and(eq(Comment.id, commentId), eq(Comment.orgId, user.orgId)));

  return users.map(({ id }) => formatChannel("user", id));
}

async function deleteComment(
  tx: Transaction,
  user: LuciaUser,
  { id: commentId, orderId, ...args }: DeleteCommentMutationArgs,
) {
  let users: Awaited<ReturnType<typeof requireAccessToOrder>>;
  try {
    assertRole(user, globalPermissions.updateOrder);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;
  } finally {
    users = await requireAccessToOrder(tx, user, orderId);
  }

  await tx
    .update(Comment)
    .set(args)
    .where(and(eq(Comment.id, commentId), eq(Comment.orgId, user.orgId)));

  return users.map(({ id }) => formatChannel("user", id));
}

export const authoritative = {
  // User
  updateUserRole,
  deleteUser,

  // Papercut Account
  deletePapercutAccount,

  // Papercut Account Manager Authorization
  createPapercutAccountManagerAuthorization,
  deletePapercutAccountManagerAuthorization,

  // Room
  createRoom,
  updateRoom,
  deleteRoom,

  // Announcement
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,

  // Product
  createProduct,
  updateProduct,
  deleteProduct,

  // Order
  createOrder,
  updateOrder,
  deleteOrder,

  // Comment
  createComment,
  updateComment,
  deleteComment,
};
