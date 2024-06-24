import { and, eq } from "drizzle-orm";
import * as v from "valibot";

import { Announcement } from "../announcement/announcement.sql";
import { lucia } from "../auth/lucia";
import { Comment } from "../comment/comment.sql";
import { ForbiddenError, NotImplementedError } from "../errors/http";
import { Order } from "../order/order.sql";
import { Organization } from "../organization";
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
import { User } from "../user/user.sql";

import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type { AuthoritativeMutators } from "../schemas/mutators";

const authorizeRole = (
  mutationName: keyof typeof rolePermissions,
  user: LuciaUser,
  shouldThrow = true,
) => {
  const isAuthorized = assertRole(
    user,
    rolePermissions[mutationName],
    shouldThrow ? ForbiddenError : undefined,
  );

  if (!isAuthorized && shouldThrow) throw new ForbiddenError();

  return isAuthorized;
};

const buildMutator =
  <
    TSchema extends v.GenericSchema,
    TMutator extends (
      tx: Transaction,
      args: v.InferOutput<TSchema>,
    ) => ReturnType<
      ReturnType<AuthoritativeMutators<TSchema>[keyof AuthoritativeMutators]>
    >,
  >(
    roleAuthorizer: (() => ReturnType<typeof authorizeRole>) | undefined,
    schema: TSchema,
    mutator: TMutator,
  ) =>
  (tx: Transaction, args: unknown) => {
    roleAuthorizer?.();

    return mutator(tx, v.parse(schema, args));
  };

const updateOrganization = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateOrganization", user),
    UpdateOrganizationMutationArgs,
    async (tx, values) => {
      await tx
        .update(Organization)
        .set(values)
        .where(eq(Organization.id, user.orgId));

      // Invalidate all non-admin users' sessions when the organization is suspended
      if (values.status === "suspended") {
        const nonAdmins = await getUsersByRoles(tx, user.orgId).then((users) =>
          users.filter(({ role }) => role !== "administrator"),
        );

        await Promise.all(
          nonAdmins.map(({ id }) => lucia.invalidateUserSessions(id)),
        );
      }

      return [formatChannel("org", user.orgId)];
    },
  );

const updateUserRole = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateUserRole", user),
    UpdateUserRoleMutationArgs,
    async (tx, { id: userId, ...values }) => {
      await tx
        .update(User)
        .set(values)
        .where(and(eq(User.id, userId), eq(User.orgId, user.orgId)));

      return [formatChannel("org", user.orgId)];
    },
  );

const deleteUser = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteUser", user),
    DeleteUserMutationArgs,
    async (tx, { id: userId, ...values }) => {
      await tx
        .update(User)
        .set(values)
        .where(and(eq(User.id, userId), eq(User.orgId, user.orgId)));

      return [formatChannel("org", user.orgId)];
    },
  );

const syncPapercutAccounts = () => {
  throw new NotImplementedError(
    'Mutation "syncPapercutAccounts" is not implemented with replicache, call directly instead (PUT /api/papercut/accounts)',
  );
};

const deletePapercutAccount = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deletePapercutAccount", user),
    DeletePapercutAccountMutationArgs,
    async (tx, { id: papercutAccountId, ...values }) => {
      const [adminsOps, managers, customers] = await Promise.all([
        getUsersByRoles(tx, user.orgId, ["administrator", "operator"]),
        tx
          .select({
            managerId: PapercutAccountManagerAuthorization.managerId,
          })
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
  );

const createPapercutAccountManagerAuthorization = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createPapercutAccountManagerAuthorization", user),
    CreatePapercutAccountManagerAuthorizationMutationArgs,
    async (tx, values) => {
      const [managerAuthorization] = await tx
        .insert(PapercutAccountManagerAuthorization)
        .values(values)
        .onConflictDoNothing()
        .returning({ id: PapercutAccountManagerAuthorization.id });

      if (!managerAuthorization) return [];

      return [formatChannel("org", user.orgId)];
    },
  );

const deletePapercutAccountManagerAuthorization = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deletePapercutAccountManagerAuthorization", user),
    DeletePapercutAccountManagerAuthorizationMutationArgs,
    async (tx, { id: papercutAccountManagerAuthorizationId, ...values }) => {
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
  );

const createRoom = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createRoom", user),
    CreateRoomMutationArgs,
    async (tx, values) => {
      const [room] = await tx
        .insert(Room)
        .values(values)
        .onConflictDoNothing()
        .returning({ id: Room.id });
      if (!room) return [];

      return [formatChannel("org", user.orgId)];
    },
  );

const updateRoom = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateRoom", user),
    UpdateRoomMutationArgs,
    async (tx, { id: roomId, ...values }) => {
      await tx
        .update(Room)
        .set(values)
        .where(and(eq(Room.id, roomId), eq(Room.orgId, user.orgId)));

      return [formatChannel("org", user.orgId)];
    },
  );

const deleteRoom = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteRoom", user),
    DeleteRoomMutationArgs,
    async (tx, { id: roomId, ...values }) => {
      await tx
        .update(Room)
        .set(values)
        .where(and(eq(Room.id, roomId), eq(Room.orgId, user.orgId)));

      return [formatChannel("org", user.orgId)];
    },
  );

const createAnnouncement = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createAnnouncement", user),
    CreateAnnouncementMutationArgs,
    async (tx, values) => {
      await tx.insert(Announcement).values(values);

      return [formatChannel("org", user.orgId)];
    },
  );

const updateAnnouncement = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateAnnouncement", user),
    UpdateAnnouncementMutationArgs,
    async (tx, { id: announcementId, ...values }) => {
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
  );

const deleteAnnouncement = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteAnnouncement", user),
    DeleteAnnouncementMutationArgs,
    async (tx, { id: announcementId, ...values }) => {
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
  );

const createProduct = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createProduct", user),
    CreateProductMutationArgs,
    async (tx, values) => {
      await tx.insert(Product).values(values);

      return [formatChannel("org", user.orgId)];
    },
  );

const updateProduct = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("updateProduct", user),
    UpdateProductMutationArgs,
    async (tx, { id: productId, ...values }) => {
      await tx
        .update(Product)
        .set(values)
        .where(and(eq(Product.id, productId), eq(Product.orgId, user.orgId)));

      return [formatChannel("org", user.orgId)];
    },
  );

const deleteProduct = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("deleteProduct", user),
    DeleteProductMutationArgs,
    async (tx, { id: productId, ...values }) => {
      await tx
        .update(Product)
        .set(values)
        .where(and(eq(Product.id, productId), eq(Product.orgId, user.orgId)));

      return [formatChannel("org", user.orgId)];
    },
  );

const createOrder = (user: LuciaUser) =>
  buildMutator(
    () => authorizeRole("createOrder", user),
    CreateOrderMutationArgs,
    async (tx, values) => {
      const [order] = await tx
        .insert(Order)
        .values(values)
        .returning({ id: Order.id });

      const users = await getUsersWithAccessToOrder(tx, order.id, user.orgId);

      return users.map(({ id }) => formatChannel("user", id));
    },
  );

const updateOrder = (user: LuciaUser) =>
  buildMutator(
    undefined,
    UpdateOrderMutationArgs,
    async (tx, { id: orderId, ...values }) => {
      const users = await requireAccessToOrder(tx, user, orderId);

      await tx
        .update(Order)
        .set(values)
        .where(and(eq(Order.id, orderId), eq(Order.orgId, user.orgId)));

      return users.map(({ id }) => formatChannel("user", id));
    },
  );

const deleteOrder = (user: LuciaUser) =>
  buildMutator(
    undefined,
    DeleteOrderMutationArgs,
    async (tx, { id: orderId, ...values }) => {
      const users = await requireAccessToOrder(tx, user, orderId);

      await tx
        .update(Order)
        .set(values)
        .where(and(eq(Order.id, orderId), eq(Order.orgId, user.orgId)));

      return users.map(({ id }) => formatChannel("user", id));
    },
  );

const createComment = (user: LuciaUser) =>
  buildMutator(undefined, CreateCommentMutationArgs, async (tx, values) => {
    const users = await requireAccessToOrder(tx, user, values.orderId);

    await tx.insert(Comment).values(values);

    return users.map(({ id }) => formatChannel("user", id));
  });

const updateComment = (user: LuciaUser) =>
  buildMutator(
    undefined,
    UpdateCommentMutationArgs,
    async (tx, { id: commentId, ...values }) => {
      const users = await requireAccessToOrder(tx, user, values.orderId);

      await tx
        .update(Comment)
        .set(values)
        .where(and(eq(Comment.id, commentId), eq(Comment.orgId, user.orgId)));

      return users.map(({ id }) => formatChannel("user", id));
    },
  );

const deleteComment = (user: LuciaUser) =>
  buildMutator(
    undefined,
    DeleteCommentMutationArgs,
    async (tx, { id: commentId, orderId, ...values }) => {
      const users = await requireAccessToOrder(tx, user, orderId);

      await tx
        .update(Comment)
        .set(values)
        .where(and(eq(Comment.id, commentId), eq(Comment.orgId, user.orgId)));

      return users.map(({ id }) => formatChannel("user", id));
    },
  );

export const mutators = {
  // Organization
  updateOrganization,

  // User
  updateUserRole,
  deleteUser,

  // Papercut Account
  syncPapercutAccounts,
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
} satisfies AuthoritativeMutators;
