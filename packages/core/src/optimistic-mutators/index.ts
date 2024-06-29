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
    TAuthorizer extends (
      tx: WriteTransaction,
      values: v.InferOutput<TSchema>,
    ) => ReturnType<TAuthorizer>,
    TMutator extends (
      tx: WriteTransaction,
      values: v.InferOutput<TSchema>,
    ) => ReturnType<
      ReturnType<OptimisticMutators<TSchema>[keyof OptimisticMutators]>
    >,
  >(
    schema: TSchema,
    authorizer: TAuthorizer,
    mutatorWithContext: (context: {
      authorized: Awaited<ReturnType<TAuthorizer>>;
    }) => TMutator,
  ) =>
  async (tx: WriteTransaction, args: v.InferInput<TSchema>) => {
    const output = v.parse(schema, args);

    const authorized = await Promise.resolve(authorizer(tx, output));

    const mutator = mutatorWithContext({ authorized });

    return mutator(tx, v.parse(schema, args));
  };

const updateOrganization = (user: LuciaUser) =>
  buildMutator(
    UpdateOrganizationMutationArgs,
    () => authorizeRole("updateOrganization", user),
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
    UpdateUserRoleMutationArgs,
    () => authorizeRole("updateUserRole", user),
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
    DeleteUserMutationArgs,
    () => authorizeRole("deleteUser", user),
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
    DeletePapercutAccountMutationArgs,
    () => authorizeRole("deletePapercutAccount", user),
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
    CreatePapercutAccountManagerAuthorizationMutationArgs,
    () => authorizeRole("createPapercutAccountManagerAuthorization", user),
    () => (tx, values) =>
      tx.set(`papercutAccountManagerAuthorization/${values.id}`, values),
  );

const deletePapercutAccountManagerAuthorization = (user: LuciaUser) =>
  buildMutator(
    DeletePapercutAccountManagerAuthorizationMutationArgs,
    () => authorizeRole("deletePapercutAccountManagerAuthorization", user),
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
    CreateRoomMutationArgs,
    () => authorizeRole("createRoom", user),
    () => (tx, values) => tx.set(`room/${values.id}`, values),
  );

const updateRoom = (user: LuciaUser) =>
  buildMutator(
    UpdateRoomMutationArgs,
    () => authorizeRole("updateRoom", user),
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
    DeleteRoomMutationArgs,
    () => authorizeRole("deleteRoom", user),
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
    CreateAnnouncementMutationArgs,
    () => authorizeRole("createAnnouncement", user),
    () => (tx, values) => tx.set(`announcement/${values.id}`, values),
  );

const updateAnnouncement = (user: LuciaUser) =>
  buildMutator(
    UpdateAnnouncementMutationArgs,
    () => authorizeRole("updateAnnouncement", user),
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
    DeleteAnnouncementMutationArgs,
    () => authorizeRole("deleteAnnouncement", user),
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
    CreateProductMutationArgs,
    () => authorizeRole("createProduct", user),
    () => (tx, values) => tx.set(`product/${values.id}`, values),
  );

const updateProduct = (user: LuciaUser) =>
  buildMutator(
    UpdateProductMutationArgs,
    () => authorizeRole("updateProduct", user),
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
    DeleteProductMutationArgs,
    () => authorizeRole("deleteProduct", user),
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
    CreateOrderMutationArgs,
    () => authorizeRole("createOrder", user),
    () => (tx, values) => tx.set(`order/${values.id}`, values),
  );

const updateOrder = (user: LuciaUser) =>
  buildMutator(
    UpdateOrderMutationArgs,
    async (tx, { id: orderId }) => {
      const isRoleAuthorized = authorizeRole("updateOrder", user, false);

      if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);
    },
    () =>
      async (tx, { id: orderId, ...values }) => {
        const prev = await tx.get<Order>(`order/${orderId}`);
        if (!prev) throw new EntityNotFoundError("Order", orderId);

        const next = { ...prev, ...values } satisfies Order;

        return await tx.set(`order/${orderId}`, next);
      },
  );

const deleteOrder = (user: LuciaUser) =>
  buildMutator(
    DeleteOrderMutationArgs,
    async (tx, { id: orderId }) => {
      const isRoleAuthorized = authorizeRole("deleteOrder", user, false);

      if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);
    },
    () =>
      async (tx, { id: orderId, ...values }) => {
        const prev = await tx.get<Order>(`order/${orderId}`);
        if (!prev) throw new EntityNotFoundError("Order", orderId);

        const next = { ...prev, ...values } satisfies Order;

        return await tx.set(`order/${orderId}`, next);
      },
  );

const createComment = (user: LuciaUser) =>
  buildMutator(
    CreateCommentMutationArgs,
    async (tx, { orderId }) => {
      const isRoleAuthorized = authorizeRole("updateOrder", user, false);

      if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);
    },
    () => (tx, values) => tx.set(`comment/${values.id}`, values),
  );

const updateComment = (user: LuciaUser) =>
  buildMutator(
    UpdateCommentMutationArgs,
    async (tx, { orderId }) => {
      const isRoleAuthorized = authorizeRole("updateComment", user, false);

      if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);
    },
    () =>
      async (tx, { id: commentId, ...values }) => {
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
    DeleteCommentMutationArgs,
    async (tx, { orderId }) => {
      const isRoleAuthorized = authorizeRole("deleteComment", user, false);

      if (!isRoleAuthorized) await requireAccessToOrder(tx, user, orderId);
    },
    () =>
      async (tx, { id: commentId, ...values }) => {
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
