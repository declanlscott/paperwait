import { and, eq } from "drizzle-orm";

import { Announcement } from "../announcement/announcement.sql";
import { Comment } from "../comment/comment.sql";
import { ForbiddenError } from "../errors/http";
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
import { User } from "../user/user.sql";
import { fn } from "../valibot";
import {
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

import type { JSONValue } from "replicache";
import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type { AuthoritativeMutation } from "./schemas";

async function updateUserRole(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(UpdateUserRoleMutationArgs, async ({ id: userId, ...values }) => {
    if (!isAuthorized) throw new ForbiddenError();

    await tx
      .update(User)
      .set(values)
      .where(and(eq(User.id, userId), eq(User.orgId, user.orgId)));

    return [formatChannel("org", user.orgId)];
  })(args);
}

async function deleteUser(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(DeleteUserMutationArgs, async ({ id: userId, ...values }) => {
    if (!isAuthorized) throw new ForbiddenError();

    await tx
      .update(User)
      .set(values)
      .where(and(eq(User.id, userId), eq(User.orgId, user.orgId)));

    return [formatChannel("org", user.orgId)];
  })(args);
}

async function deletePapercutAccount(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(
    DeletePapercutAccountMutationArgs,
    async ({ id: papercutAccountId, ...values }) => {
      if (!isAuthorized) throw new ForbiddenError();

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
          .select({
            customerId: PapercutAccountCustomerAuthorization.customerId,
          })
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
          .set(values)
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
    },
  )(args);
}

async function createPapercutAccountManagerAuthorization(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(
    CreatePapercutAccountManagerAuthorizationMutationArgs,
    async (values) => {
      if (!isAuthorized) throw new ForbiddenError();

      const [managerAuthorization] = await tx
        .insert(PapercutAccountManagerAuthorization)
        .values(values)
        .onConflictDoNothing()
        .returning({ id: PapercutAccountManagerAuthorization.id });

      if (!managerAuthorization) return [];

      return [formatChannel("org", user.orgId)];
    },
  )(args);
}

async function deletePapercutAccountManagerAuthorization(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(
    DeletePapercutAccountManagerAuthorizationMutationArgs,
    async ({ id: papercutAccountManagerAuthorizationId, ...values }) => {
      if (!isAuthorized) throw new ForbiddenError();

      await tx
        .update(PapercutAccountManagerAuthorization)
        .set(values)
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
    },
  )(args);
}

async function createRoom(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(CreateRoomMutationArgs, async (values) => {
    if (!isAuthorized) throw new ForbiddenError();

    const [room] = await tx
      .insert(Room)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: Room.id });
    if (!room) return [];

    return [formatChannel("org", user.orgId)];
  })(args);
}

async function updateRoom(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(UpdateRoomMutationArgs, async ({ id: roomId, ...values }) => {
    if (!isAuthorized) throw new ForbiddenError();

    await tx
      .update(Room)
      .set(values)
      .where(and(eq(Room.id, roomId), eq(Room.orgId, user.orgId)));

    return [formatChannel("org", user.orgId)];
  })(args);
}

async function deleteRoom(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(DeleteRoomMutationArgs, async ({ id: roomId, ...values }) => {
    if (!isAuthorized) throw new ForbiddenError();

    await tx
      .update(Room)
      .set(values)
      .where(and(eq(Room.id, roomId), eq(Room.orgId, user.orgId)));

    return [formatChannel("org", user.orgId)];
  })(args);
}

async function createAnnouncement(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(CreateAnnouncementMutationArgs, async (values) => {
    if (!isAuthorized) throw new ForbiddenError();

    await tx.insert(Announcement).values(values);

    return [formatChannel("org", user.orgId)];
  })(args);
}

async function updateAnnouncement(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(
    UpdateAnnouncementMutationArgs,
    async ({ id: announcementId, ...values }) => {
      if (!isAuthorized) throw new ForbiddenError();

      await tx
        .update(Announcement)
        .set(values)
        .where(
          and(
            eq(Announcement.id, announcementId),
            eq(Announcement.orgId, user.orgId),
          ),
        );

      return [formatChannel("org", user.orgId)];
    },
  )(args);
}

async function deleteAnnouncement(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(
    DeleteAnnouncementMutationArgs,
    async ({ id: announcementId, ...values }) => {
      if (!isAuthorized) throw new ForbiddenError();

      await tx
        .update(Announcement)
        .set(values)
        .where(
          and(
            eq(Announcement.id, announcementId),
            eq(Announcement.orgId, user.orgId),
          ),
        );

      return [formatChannel("org", user.orgId)];
    },
  )(args);
}

async function createProduct(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(CreateProductMutationArgs, async (values) => {
    if (!isAuthorized) throw new ForbiddenError();

    await tx.insert(Product).values(values);

    return [formatChannel("org", user.orgId)];
  })(args);
}

async function updateProduct(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(UpdateProductMutationArgs, async ({ id: productId, ...values }) => {
    if (!isAuthorized) throw new ForbiddenError();

    await tx
      .update(Product)
      .set(values)
      .where(and(eq(Product.id, productId), eq(Product.orgId, user.orgId)));

    return [formatChannel("org", user.orgId)];
  })(args);
}

async function deleteProduct(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(DeleteProductMutationArgs, async ({ id: productId, ...values }) => {
    if (!isAuthorized) throw new ForbiddenError();

    await tx
      .update(Product)
      .set(values)
      .where(and(eq(Product.id, productId), eq(Product.orgId, user.orgId)));

    return [formatChannel("org", user.orgId)];
  })(args);
}

async function createOrder(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  isAuthorized: boolean,
) {
  return fn(CreateOrderMutationArgs, async (values) => {
    if (!isAuthorized) throw new ForbiddenError();

    const [order] = await tx
      .insert(Order)
      .values(values)
      .returning({ id: Order.id });

    const users = await getUsersWithAccessToOrder(tx, order.id, user.orgId);

    return users.map(({ id }) => formatChannel("user", id));
  })(args);
}

async function updateOrder(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  _isAuthorized: boolean,
) {
  return fn(UpdateOrderMutationArgs, async ({ id: orderId, ...values }) => {
    const users = await requireAccessToOrder(tx, user, orderId);

    await tx
      .update(Order)
      .set(values)
      .where(and(eq(Order.id, orderId), eq(Order.orgId, user.orgId)));

    return users.map(({ id }) => formatChannel("user", id));
  })(args);
}

async function deleteOrder(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  _isAuthorized: boolean,
) {
  return fn(DeleteOrderMutationArgs, async ({ id: orderId, ...values }) => {
    const users = await requireAccessToOrder(tx, user, orderId);

    await tx
      .update(Order)
      .set(values)
      .where(and(eq(Order.id, orderId), eq(Order.orgId, user.orgId)));

    return users.map(({ id }) => formatChannel("user", id));
  })(args);
}

async function createComment(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  _isAuthorized: boolean,
) {
  return fn(CreateCommentMutationArgs, async (values) => {
    const users = await requireAccessToOrder(tx, user, values.orderId);

    await tx.insert(Comment).values(values);

    return users.map(({ id }) => formatChannel("user", id));
  })(args);
}

async function updateComment(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  _isAuthorized: boolean,
) {
  return fn(UpdateCommentMutationArgs, async ({ id: commentId, ...values }) => {
    const users = await requireAccessToOrder(tx, user, values.orderId);

    await tx
      .update(Comment)
      .set(values)
      .where(and(eq(Comment.id, commentId), eq(Comment.orgId, user.orgId)));

    return users.map(({ id }) => formatChannel("user", id));
  })(args);
}

async function deleteComment(
  tx: Transaction,
  user: LuciaUser,
  args: JSONValue,
  _isAuthorized: boolean,
) {
  return fn(
    DeleteCommentMutationArgs,
    async ({ id: commentId, orderId, ...values }) => {
      const users = await requireAccessToOrder(tx, user, orderId);

      await tx
        .update(Comment)
        .set(values)
        .where(and(eq(Comment.id, commentId), eq(Comment.orgId, user.orgId)));

      return users.map(({ id }) => formatChannel("user", id));
    },
  )(args);
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
} satisfies AuthoritativeMutation;
