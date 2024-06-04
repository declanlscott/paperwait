import { unique } from "remeda";

import {
  ApplicationError,
  EntityNotFoundError,
  OrderAccessDeniedError,
} from "../errors/application";
import { assertRole } from "../user/assert";
import { globalPermissions } from "./schemas";

import type {
  DeepReadonly,
  DeepReadonlyObject,
  WriteTransaction,
} from "replicache";
import type { Announcement } from "../announcement/announcement.sql";
import type { LuciaUser } from "../auth/lucia";
import type { Comment } from "../comment/comment.sql";
import type { Order } from "../order/order.sql";
import type {
  PapercutAccount,
  PapercutAccountManagerAuthorization,
} from "../papercut";
import type { Product } from "../product/product.sql";
import type { Room } from "../room/room.sql";
import type { User } from "../user/user.sql";
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
  tx: WriteTransaction,
  user: LuciaUser,
  { id: userId, ...args }: UpdateUserRoleMutationArgs,
) {
  assertRole(user, globalPermissions.updateUserRole);

  const prev = await tx.get<User>(`user/${userId}`);
  if (!prev) throw new EntityNotFoundError("User", userId);

  const next = { ...prev, ...args } satisfies User;

  return await tx.set(`user/${userId}`, next);
}

async function deleteUser(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: userId, ...args }: DeleteUserMutationArgs,
) {
  assertRole(user, globalPermissions.deleteUser);

  const prev = await tx.get<User>(`user/${userId}`);
  if (!prev) throw new EntityNotFoundError("User", userId);

  const next = { ...prev, ...args } satisfies User;

  return await tx.set(`user/${userId}`, next);
}

async function deletePapercutAccount(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: papercutAccountId, ...args }: DeletePapercutAccountMutationArgs,
) {
  assertRole(user, globalPermissions.deletePapercutAccount);

  const prev = await tx.get<PapercutAccount>(
    `papercutAccount/${papercutAccountId}`,
  );
  if (!prev)
    throw new EntityNotFoundError("PapercutAccount", papercutAccountId);

  const next = { ...prev, ...args } satisfies PapercutAccount;

  return await tx.set(`papercutAccount/${papercutAccountId}`, next);
}

async function createPapercutAccountManagerAuthorization(
  tx: WriteTransaction,
  user: LuciaUser,
  args: CreatePapercutAccountManagerAuthorizationMutationArgs,
) {
  assertRole(user, globalPermissions.createPapercutAccountManagerAuthorization);

  return await tx.set(`papercutAccountManagerAuthorization/${args.id}`, args);
}

async function deletePapercutAccountManagerAuthorization(
  tx: WriteTransaction,
  user: LuciaUser,
  {
    id: papercutAccountManagerAuthorizationId,
    ...args
  }: DeletePapercutAccountManagerAuthorizationMutationArgs,
) {
  assertRole(user, globalPermissions.deletePapercutAccountManagerAuthorization);

  const prev = await tx.get<PapercutAccountManagerAuthorization>(
    `papercutAccountManagerAuthorization/${papercutAccountManagerAuthorizationId}`,
  );
  if (!prev)
    throw new EntityNotFoundError(
      "PapercutAccountManagerAuthorization",
      papercutAccountManagerAuthorizationId,
    );

  const next = {
    ...prev,
    ...args,
  } satisfies PapercutAccountManagerAuthorization;

  return await tx.set(
    `papercutAccountManagerAuthorization/${papercutAccountManagerAuthorizationId}`,
    next,
  );
}

async function createRoom(
  tx: WriteTransaction,
  user: LuciaUser,
  args: CreateRoomMutationArgs,
) {
  assertRole(user, globalPermissions.createRoom);

  return await tx.set(`room/${args.id}`, args);
}

async function updateRoom(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: roomId, ...args }: UpdateRoomMutationArgs,
) {
  assertRole(user, globalPermissions.updateRoom);

  const prev = await tx.get<Room>(`room/${roomId}`);
  if (!prev) throw new EntityNotFoundError("Room", roomId);
  const next = { ...prev, ...args } satisfies Room;

  return await tx.set(`room/${roomId}`, next);
}

async function deleteRoom(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: roomId, ...args }: DeleteRoomMutationArgs,
) {
  assertRole(user, globalPermissions.deleteRoom);

  const prev = await tx.get<Room>(`room/${roomId}`);
  if (!prev) throw new EntityNotFoundError("Room", roomId);
  const next = { ...prev, ...args } satisfies Room;

  return await tx.set(`room/${roomId}`, next);
}

async function createAnnouncement(
  tx: WriteTransaction,
  user: LuciaUser,
  args: CreateAnnouncementMutationArgs,
) {
  assertRole(user, globalPermissions.createAnnouncement);

  return await tx.set(`announcement/${args.id}`, args);
}

async function updateAnnouncement(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: announcementId, ...args }: UpdateAnnouncementMutationArgs,
) {
  assertRole(user, globalPermissions.updateAnnouncement);

  const prev = await tx.get<Announcement>(`announcement/${announcementId}`);
  if (!prev) throw new EntityNotFoundError("Announcement", announcementId);
  const next = { ...prev, ...args } satisfies Announcement;

  return await tx.set(`announcement/${announcementId}`, next);
}

async function deleteAnnouncement(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: announcementId, ...args }: DeleteAnnouncementMutationArgs,
) {
  assertRole(user, globalPermissions.deleteAnnouncement);

  const prev = await tx.get<Announcement>(`announcement/${announcementId}`);
  if (!prev) throw new EntityNotFoundError("Announcement", announcementId);
  const next = { ...prev, ...args } satisfies Announcement;

  return await tx.set(`announcement/${announcementId}`, next);
}

async function createProduct(
  tx: WriteTransaction,
  user: LuciaUser,
  args: CreateProductMutationArgs,
) {
  assertRole(user, globalPermissions.createProduct);

  return await tx.set(`product/${args.id}`, args);
}

async function updateProduct(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: productId, ...args }: UpdateProductMutationArgs,
) {
  assertRole(user, globalPermissions.updateProduct);

  const prev = await tx.get<Product>(`product/${productId}`);
  if (!prev) throw new EntityNotFoundError("Product", productId);
  const next = { ...prev, ...args } satisfies Product;

  return await tx.set(`product/${productId}`, next);
}

async function deleteProduct(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: productId, ...args }: DeleteProductMutationArgs,
) {
  assertRole(user, globalPermissions.deleteProduct);

  const prev = await tx.get<Product>(`product/${productId}`);
  if (!prev) throw new EntityNotFoundError("Product", productId);
  const next = { ...prev, ...args } satisfies Product;

  return await tx.set(`product/${productId}`, next);
}

async function createOrder(
  tx: WriteTransaction,
  user: LuciaUser,
  args: CreateOrderMutationArgs,
) {
  assertRole(user, globalPermissions.createOrder);

  return await tx.set(`order/${args.id}`, args);
}

async function updateOrder(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: orderId, ...args }: UpdateOrderMutationArgs,
) {
  try {
    assertRole(user, globalPermissions.updateOrder);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;

    await requireAccessToOrder(tx, user, orderId);
  }

  const prev = await tx.get<Order>(`order/${orderId}`);
  if (!prev) throw new EntityNotFoundError("Order", orderId);

  const next = { ...prev, ...args } satisfies Order;

  return await tx.set(`order/${orderId}`, next);
}

async function deleteOrder(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: orderId, ...args }: DeleteOrderMutationArgs,
) {
  try {
    assertRole(user, globalPermissions.deleteOrder);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;

    await requireAccessToOrder(tx, user, orderId);
  }

  const prev = await tx.get<Order>(`order/${orderId}`);
  if (!prev) throw new EntityNotFoundError("Order", orderId);

  const next = { ...prev, ...args } satisfies Order;

  return await tx.set(`order/${orderId}`, next);
}

async function createComment(
  tx: WriteTransaction,
  user: LuciaUser,
  args: CreateCommentMutationArgs,
) {
  try {
    assertRole(user, globalPermissions.updateOrder);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;

    await requireAccessToOrder(tx, user, args.orderId);
  }

  return await tx.set(`comment/${args.id}`, args);
}

async function updateComment(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: commentId, ...args }: UpdateCommentMutationArgs,
) {
  try {
    assertRole(user, globalPermissions.updateOrder);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;

    await requireAccessToOrder(tx, user, args.orderId);
  }

  const prev = await tx.get<Comment>(`comment/${commentId}`);
  if (!prev) throw new EntityNotFoundError("Comment", commentId);

  const next = { ...prev, ...args } satisfies DeepReadonlyObject<Comment>;

  return await tx.set(`comment/${commentId}`, next);
}

async function deleteComment(
  tx: WriteTransaction,
  user: LuciaUser,
  { id: commentId, orderId, ...args }: DeleteCommentMutationArgs,
) {
  try {
    assertRole(user, globalPermissions.deleteComment);
  } catch (e) {
    if (!(e instanceof ApplicationError)) throw e;

    await requireAccessToOrder(tx, user, orderId);
  }

  const prev = await tx.get<Comment>(`comment/${commentId}`);
  if (!prev) throw new EntityNotFoundError("Comment", commentId);

  const next = { ...prev, ...args } satisfies DeepReadonly<Comment>;

  return await tx.set(`comment/${commentId}`, next);
}

export const optimistic = {
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

async function requireAccessToOrder(
  tx: WriteTransaction,
  user: LuciaUser,
  orderId: Order["id"],
) {
  const userIds = await getUsersWithAccessToOrder(tx, orderId);

  if (!userIds.includes(user.id)) throw new OrderAccessDeniedError();
}

async function getUsersWithAccessToOrder(
  tx: WriteTransaction,
  orderId: Order["id"],
) {
  const order = await tx.get<Order>(`order/${orderId}`);
  if (!order) throw new EntityNotFoundError("Order", orderId);

  const [admins, operators, papercutAccountManagerAuthorizations] =
    await Promise.all([
      tx
        .scan<User>({ prefix: "user/" })
        .toArray()
        .then((users) => users.filter((user) => user.role === "administrator")),
      tx
        .scan<User>({ prefix: "user/" })
        .toArray()
        .then((users) => users.filter((user) => user.role === "operator")),
      tx
        .scan<PapercutAccountManagerAuthorization>({
          prefix: "papercutAccountManagerAuthorization/",
        })
        .toArray()
        .then((papercutAccountManagerAuthorizations) =>
          papercutAccountManagerAuthorizations.filter(
            ({ papercutAccountId }) =>
              order.papercutAccountId === papercutAccountId,
          ),
        ),
    ]);

  return unique([
    ...admins.map(({ id }) => id),
    ...operators.map(({ id }) => id),
    ...papercutAccountManagerAuthorizations.map(({ managerId }) => managerId),
    order.customerId,
  ]);
}
