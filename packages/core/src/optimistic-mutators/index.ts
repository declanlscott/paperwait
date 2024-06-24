import { unique } from "remeda";
import * as v from "valibot";

import {
  EntityNotFoundError,
  InvalidUserRoleError,
  OrderAccessDeniedError,
} from "../errors/application";
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
  rolePermissions,
  UpdateAnnouncementMutationArgs,
  UpdateCommentMutationArgs,
  UpdateOrderMutationArgs,
  UpdateOrganizationMutationArgs,
  UpdateProductMutationArgs,
  UpdateRoomMutationArgs,
  UpdateUserRoleMutationArgs,
} from "../schemas/mutators";
import { assertRole } from "../user/assert";

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
import type { OptimisticMutators } from "../schemas/mutators";
import type { User } from "../user/user.sql";

const authorizeRole = (
  mutationName: keyof typeof rolePermissions,
  user: LuciaUser,
  shouldThrow = true,
) =>
  assertRole(
    user,
    rolePermissions[mutationName],
    shouldThrow ? InvalidUserRoleError : undefined,
  );

const buildMutator =
  <
    TSchema extends v.GenericSchema,
    TMutator extends (
      tx: WriteTransaction,
      values: v.InferOutput<TSchema>,
    ) => ReturnType<
      ReturnType<OptimisticMutators<TSchema>[keyof OptimisticMutators]>
    >,
  >(
    roleAuthorizer: () => ReturnType<typeof authorizeRole>,
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
    () => authorizeRole("updateOrganization", user),
    UpdateOrganizationMutationArgs,
    () =>
      async (tx, { id: orgId, ...values }) => {
        const prev = await tx.get<Organization>(`organization/${orgId}`);
        if (!prev) throw new EntityNotFoundError("Organization", orgId);

        const next = { ...prev, ...values } satisfies Organization;

        return await tx.set(`organization/${orgId}`, next);
      },
  );

const updateUserRole = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateUserRole", user),
    UpdateUserRoleMutationArgs,
    () =>
      async (tx, { id: userId, ...values }) => {
        const prev = await tx.get<User>(`user/${userId}`);
        if (!prev) throw new EntityNotFoundError("User", userId);

        const next = { ...prev, ...values } satisfies User;

        return await tx.set(`user/${userId}`, next);
      },
  );

const deleteUser = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteUser", user),
    DeleteUserMutationArgs,
    () =>
      async (tx, { id: userId, ...values }) => {
        const prev = await tx.get<User>(`user/${userId}`);
        if (!prev) throw new EntityNotFoundError("User", userId);

        const next = { ...prev, ...values } satisfies User;

        return await tx.set(`user/${userId}`, next);
      },
  );

const deletePapercutAccount = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deletePapercutAccount", user),
    DeletePapercutAccountMutationArgs,
    () =>
      async (tx, { id: papercutAccountId, ...values }) => {
        const prev = await tx.get<PapercutAccount>(
          `papercutAccount/${papercutAccountId}`,
        );
        if (!prev)
          throw new EntityNotFoundError("PapercutAccount", papercutAccountId);

        const next = { ...prev, ...values } satisfies PapercutAccount;

        return await tx.set(`papercutAccount/${papercutAccountId}`, next);
      },
  );

const createPapercutAccountManagerAuthorization = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createPapercutAccountManagerAuthorization", user),
    CreatePapercutAccountManagerAuthorizationMutationArgs,
    () => async (tx, values) =>
      tx.set(`papercutAccountManagerAuthorization/${values.id}`, values),
  );

const deletePapercutAccountManagerAuthorization = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deletePapercutAccountManagerAuthorization", user),
    DeletePapercutAccountManagerAuthorizationMutationArgs,
    () =>
      async (tx, { id: papercutAccountManagerAuthorizationId, ...values }) => {
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
          ...values,
        } satisfies PapercutAccountManagerAuthorization;

        return await tx.set(
          `papercutAccountManagerAuthorization/${papercutAccountManagerAuthorizationId}`,
          next,
        );
      },
  );

const createRoom = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createRoom", user),
    CreateRoomMutationArgs,
    () => async (tx, values) => tx.set(`room/${values.id}`, values),
  );

const updateRoom = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateRoom", user),
    UpdateRoomMutationArgs,
    () =>
      async (tx, { id: roomId, ...values }) => {
        const prev = await tx.get<Room>(`room/${roomId}`);
        if (!prev) throw new EntityNotFoundError("Room", roomId);
        const next = { ...prev, ...values } satisfies Room;

        return await tx.set(`room/${roomId}`, next);
      },
  );

const deleteRoom = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteRoom", user),
    DeleteRoomMutationArgs,
    () =>
      async (tx, { id: roomId, ...values }) => {
        const prev = await tx.get<Room>(`room/${roomId}`);
        if (!prev) throw new EntityNotFoundError("Room", roomId);
        const next = { ...prev, ...values } satisfies Room;

        return await tx.set(`room/${roomId}`, next);
      },
  );

const createAnnouncement = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createAnnouncement", user),
    CreateAnnouncementMutationArgs,
    () => async (tx, values) => tx.set(`announcement/${values.id}`, values),
  );

const updateAnnouncement = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateAnnouncement", user),
    UpdateAnnouncementMutationArgs,
    () =>
      async (tx, { id: announcementId, ...values }) => {
        const prev = await tx.get<Announcement>(
          `announcement/${announcementId}`,
        );
        if (!prev)
          throw new EntityNotFoundError("Announcement", announcementId);
        const next = { ...prev, ...values } satisfies Announcement;

        return await tx.set(`announcement/${announcementId}`, next);
      },
  );

const deleteAnnouncement = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteAnnouncement", user),
    DeleteAnnouncementMutationArgs,
    () =>
      async (tx, { id: announcementId, ...values }) => {
        const prev = await tx.get<Announcement>(
          `announcement/${announcementId}`,
        );
        if (!prev)
          throw new EntityNotFoundError("Announcement", announcementId);
        const next = { ...prev, ...values } satisfies Announcement;

        return await tx.set(`announcement/${announcementId}`, next);
      },
  );

const createProduct = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createProduct", user),
    CreateProductMutationArgs,
    () => async (tx, values) => tx.set(`product/${values.id}`, values),
  );

const updateProduct = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateProduct", user),
    UpdateProductMutationArgs,
    () =>
      async (tx, { id: productId, ...values }) => {
        const prev = await tx.get<Product>(`product/${productId}`);
        if (!prev) throw new EntityNotFoundError("Product", productId);
        const next = { ...prev, ...values } satisfies Product;

        return await tx.set(`product/${productId}`, next);
      },
  );

const deleteProduct = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteProduct", user),
    DeleteProductMutationArgs,
    () =>
      async (tx, { id: productId, ...values }) => {
        const prev = await tx.get<Product>(`product/${productId}`);
        if (!prev) throw new EntityNotFoundError("Product", productId);
        const next = { ...prev, ...values } satisfies Product;

        return await tx.set(`product/${productId}`, next);
      },
  );

const createOrder = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createOrder", user),
    CreateOrderMutationArgs,
    () => async (tx, values) => tx.set(`order/${values.id}`, values),
  );

const updateOrder = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateOrder", user, false),
    UpdateOrderMutationArgs,
    (isRoleAuthorized) =>
      async (tx, { id: orderId, ...values }) => {
        if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);

        const prev = await tx.get<Order>(`order/${orderId}`);
        if (!prev) throw new EntityNotFoundError("Order", orderId);

        const next = { ...prev, ...values } satisfies Order;

        return await tx.set(`order/${orderId}`, next);
      },
  );

const deleteOrder = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteOrder", user, false),
    DeleteOrderMutationArgs,
    (isRoleAuthorized) =>
      async (tx, { id: orderId, ...values }) => {
        if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);

        const prev = await tx.get<Order>(`order/${orderId}`);
        if (!prev) throw new EntityNotFoundError("Order", orderId);

        const next = { ...prev, ...values } satisfies Order;

        return await tx.set(`order/${orderId}`, next);
      },
  );

const createComment = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateOrder", user, false),
    CreateCommentMutationArgs,
    (isRoleAuthorized) => async (tx, values) => {
      if (!isRoleAuthorized)
        await requireAccessToOrder(tx, user, values.orderId);

      return await tx.set(`comment/${values.id}`, values);
    },
  );

const updateComment = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateComment", user, false),
    UpdateCommentMutationArgs,
    (isRoleAuthorized) =>
      async (tx, { id: commentId, ...values }) => {
        if (!isRoleAuthorized)
          await requireAccessToOrder(tx, user, values.orderId);

        const prev = await tx.get<Comment>(`comment/${commentId}`);
        if (!prev) throw new EntityNotFoundError("Comment", commentId);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Comment>;

        return await tx.set(`comment/${commentId}`, next);
      },
  );

const deleteComment = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteComment", user, false),
    DeleteCommentMutationArgs,
    (isRoleAuthorized) =>
      async (tx, { id: commentId, orderId, ...values }) => {
        if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);

        const prev = await tx.get<Comment>(`comment/${commentId}`);
        if (!prev) throw new EntityNotFoundError("Comment", commentId);

        const next = {
          ...prev,
          ...values,
        } satisfies DeepReadonlyObject<Comment>;

        return await tx.set(`comment/${commentId}`, next);
      },
  );

export const mutators = {
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
} satisfies OptimisticMutators;

async function requireAccessToOrder(
  tx: WriteTransaction,
  user: LuciaUser,
  orderId: Order["id"],
) {
  const userIds = await getUsersWithAccessToOrder(tx, orderId);

  if (!userIds.includes(user.id)) throw new OrderAccessDeniedError();

  return userIds;
}

async function getUsersWithAccessToOrder(
  tx: WriteTransaction,
  orderId: Order["id"],
) {
  const order = await tx.get<Order>(`order/${orderId}`);
  if (!order) throw new EntityNotFoundError("Order", orderId);

  const [adminsOps, papercutAccountManagerAuthorizations] = await Promise.all([
    tx
      .scan<User>({ prefix: "user/" })
      .toArray()
      .then((users) =>
        users.filter(
          (user) => user.role === "administrator" || user.role === "operator",
        ),
      ),
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
    ...adminsOps.map(({ id }) => id),
    ...papercutAccountManagerAuthorizations.map(({ managerId }) => managerId),
    order.customerId,
  ]);
}
