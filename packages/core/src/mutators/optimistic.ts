import { unique } from "remeda";
import * as v from "valibot";

import {
  EntityNotFoundError,
  OrderAccessDeniedError,
} from "../errors/application";
import { assertRole } from "../user/assert";
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
  globalPermissions,
  UpdateAnnouncementMutationArgs,
  UpdateCommentMutationArgs,
  UpdateOrderMutationArgs,
  UpdateOrganizationMutationArgs,
  UpdateProductMutationArgs,
  UpdateRoomMutationArgs,
  UpdateUserRoleMutationArgs,
} from "./schemas";

import type { DeepReadonlyObject, WriteTransaction } from "replicache";
import type { Announcement } from "../announcement/announcement.sql";
import type { LuciaUser } from "../auth/lucia";
import type { Comment } from "../comment/comment.sql";
import type { Order } from "../order/order.sql";
import type { Organization } from "../organization/organization.sql";
import type {
  PapercutAccount,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import type { Product } from "../product/product.sql";
import type { Room } from "../room/room.sql";
import type { User } from "../user/user.sql";
import type { OptimisticMutation } from "./schemas";

const buildMutator =
  <
    TSchema extends v.GenericSchema,
    TMutator extends (
      tx: WriteTransaction,
      args: v.InferOutput<TSchema>,
    ) => ReturnType<TMutator>,
  >(
    roleAuthorizer: () => boolean,
    schema: TSchema,
    withRoleAuthorizer: (
      isRoleAuthorized: ReturnType<typeof roleAuthorizer>,
    ) => TMutator,
  ) =>
  (tx: WriteTransaction, args: v.InferInput<TSchema>) => {
    const mutator = withRoleAuthorizer(roleAuthorizer());

    return mutator(tx, v.parse(schema, args));
  };

const updateOrganization = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.updateOrganization),
    UpdateOrganizationMutationArgs,
    () =>
      async (tx, { id: orgId, ...args }) => {
        const prev = await tx.get<Organization>(`organization/${orgId}`);
        if (!prev) throw new EntityNotFoundError("Organization", orgId);

        const next = { ...prev, ...args } satisfies Organization;

        return await tx.set(`organization/${orgId}`, next);
      },
  );

const updateUserRole = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.updateUserRole),
    UpdateUserRoleMutationArgs,
    () =>
      async (tx, { id: userId, ...args }) => {
        const prev = await tx.get<User>(`user/${userId}`);
        if (!prev) throw new EntityNotFoundError("User", userId);

        const next = { ...prev, ...args } satisfies User;

        return await tx.set(`user/${userId}`, next);
      },
  );

const deleteUser = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.deleteUser),
    DeleteUserMutationArgs,
    () =>
      async (tx, { id: userId, ...args }) => {
        const prev = await tx.get<User>(`user/${userId}`);
        if (!prev) throw new EntityNotFoundError("User", userId);

        const next = { ...prev, ...args } satisfies User;

        return await tx.set(`user/${userId}`, next);
      },
  );

const deletePapercutAccount = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.deletePapercutAccount),
    DeletePapercutAccountMutationArgs,
    () =>
      async (tx, { id: papercutAccountId, ...args }) => {
        const prev = await tx.get<PapercutAccount>(
          `papercutAccount/${papercutAccountId}`,
        );
        if (!prev)
          throw new EntityNotFoundError("PapercutAccount", papercutAccountId);

        const next = { ...prev, ...args } satisfies PapercutAccount;

        return await tx.set(`papercutAccount/${papercutAccountId}`, next);
      },
  );

const createPapercutAccountManagerAuthorization = (user: LuciaUser) =>
  buildMutator(
    () =>
      assertRole(
        user,
        globalPermissions.createPapercutAccountManagerAuthorization,
      ),
    CreatePapercutAccountManagerAuthorizationMutationArgs,
    () => async (tx, args) =>
      tx.set(`papercutAccountManagerAuthorization/${args.id}`, args),
  );

const deletePapercutAccountManagerAuthorization = (user: LuciaUser) =>
  buildMutator(
    () =>
      assertRole(
        user,
        globalPermissions.deletePapercutAccountManagerAuthorization,
      ),
    DeletePapercutAccountManagerAuthorizationMutationArgs,
    () =>
      async (tx, { id: papercutAccountManagerAuthorizationId, ...args }) => {
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
      },
  );

const createRoom = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.createRoom),
    CreateRoomMutationArgs,
    () => async (tx, args) => tx.set(`room/${args.id}`, args),
  );

const updateRoom = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.updateRoom),
    UpdateRoomMutationArgs,
    () =>
      async (tx, { id: roomId, ...args }) => {
        const prev = await tx.get<Room>(`room/${roomId}`);
        if (!prev) throw new EntityNotFoundError("Room", roomId);
        const next = { ...prev, ...args } satisfies Room;

        return await tx.set(`room/${roomId}`, next);
      },
  );

const deleteRoom = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.deleteRoom),
    DeleteRoomMutationArgs,
    () =>
      async (tx, { id: roomId, ...args }) => {
        const prev = await tx.get<Room>(`room/${roomId}`);
        if (!prev) throw new EntityNotFoundError("Room", roomId);
        const next = { ...prev, ...args } satisfies Room;

        return await tx.set(`room/${roomId}`, next);
      },
  );

const createAnnouncement = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.createAnnouncement),
    CreateAnnouncementMutationArgs,
    () => async (tx, args) => tx.set(`announcement/${args.id}`, args),
  );

const updateAnnouncement = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.updateAnnouncement),
    UpdateAnnouncementMutationArgs,
    () =>
      async (tx, { id: announcementId, ...args }) => {
        const prev = await tx.get<Announcement>(
          `announcement/${announcementId}`,
        );
        if (!prev)
          throw new EntityNotFoundError("Announcement", announcementId);
        const next = { ...prev, ...args } satisfies Announcement;

        return await tx.set(`announcement/${announcementId}`, next);
      },
  );

const deleteAnnouncement = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.deleteAnnouncement),
    DeleteAnnouncementMutationArgs,
    () =>
      async (tx, { id: announcementId, ...args }) => {
        const prev = await tx.get<Announcement>(
          `announcement/${announcementId}`,
        );
        if (!prev)
          throw new EntityNotFoundError("Announcement", announcementId);
        const next = { ...prev, ...args } satisfies Announcement;

        return await tx.set(`announcement/${announcementId}`, next);
      },
  );

const createProduct = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.createProduct),
    CreateProductMutationArgs,
    () => async (tx, args) => tx.set(`product/${args.id}`, args),
  );

const updateProduct = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.updateProduct),
    UpdateProductMutationArgs,
    () =>
      async (tx, { id: productId, ...args }) => {
        const prev = await tx.get<Product>(`product/${productId}`);
        if (!prev) throw new EntityNotFoundError("Product", productId);
        const next = { ...prev, ...args } satisfies Product;

        return await tx.set(`product/${productId}`, next);
      },
  );

const deleteProduct = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.deleteProduct),
    DeleteProductMutationArgs,
    () =>
      async (tx, { id: productId, ...args }) => {
        const prev = await tx.get<Product>(`product/${productId}`);
        if (!prev) throw new EntityNotFoundError("Product", productId);
        const next = { ...prev, ...args } satisfies Product;

        return await tx.set(`product/${productId}`, next);
      },
  );

const createOrder = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.createOrder),
    CreateOrderMutationArgs,
    () => async (tx, args) => tx.set(`order/${args.id}`, args),
  );

const updateOrder = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.updateOrder, false),
    UpdateOrderMutationArgs,
    (isRoleAuthorized) =>
      async (tx, { id: orderId, ...args }) => {
        if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);

        const prev = await tx.get<Order>(`order/${orderId}`);
        if (!prev) throw new EntityNotFoundError("Order", orderId);

        const next = { ...prev, ...args } satisfies Order;

        return await tx.set(`order/${orderId}`, next);
      },
  );

const deleteOrder = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.deleteOrder, false),
    DeleteOrderMutationArgs,
    (isRoleAuthorized) =>
      async (tx, { id: orderId, ...args }) => {
        if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);

        const prev = await tx.get<Order>(`order/${orderId}`);
        if (!prev) throw new EntityNotFoundError("Order", orderId);

        const next = { ...prev, ...args } satisfies Order;

        return await tx.set(`order/${orderId}`, next);
      },
  );

const createComment = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.updateOrder, false),
    CreateCommentMutationArgs,
    (isRoleAuthorized) => async (tx, args) => {
      if (!isRoleAuthorized) await requireAccessToOrder(tx, user, args.orderId);

      return await tx.set(`comment/${args.id}`, args);
    },
  );

const updateComment = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.updateOrder, false),
    UpdateCommentMutationArgs,
    (isRoleAuthorized) =>
      async (tx, { id: commentId, ...args }) => {
        if (!isRoleAuthorized)
          await requireAccessToOrder(tx, user, args.orderId);

        const prev = await tx.get<Comment>(`comment/${commentId}`);
        if (!prev) throw new EntityNotFoundError("Comment", commentId);

        const next = { ...prev, ...args } satisfies DeepReadonlyObject<Comment>;

        return await tx.set(`comment/${commentId}`, next);
      },
  );

const deleteComment = (user: LuciaUser) =>
  buildMutator(
    () => assertRole(user, globalPermissions.deleteComment, false),
    DeleteCommentMutationArgs,
    (isRoleAuthorized) =>
      async (tx, { id: commentId, orderId, ...args }) => {
        if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);

        const prev = await tx.get<Comment>(`comment/${commentId}`);
        if (!prev) throw new EntityNotFoundError("Comment", commentId);

        const next = { ...prev, ...args } satisfies DeepReadonlyObject<Comment>;

        return await tx.set(`comment/${commentId}`, next);
      },
  );

export const optimistic = {
  // Organization
  updateOrganization,

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
} satisfies OptimisticMutation;

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
