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
    TAuthorizer extends (
      tx: Transaction,
      values: v.InferOutput<TSchema>,
    ) => ReturnType<TAuthorizer>,
    TMutator extends (
      tx: Transaction,
      values: v.InferOutput<TSchema>,
    ) => ReturnType<
      ReturnType<AuthoritativeMutators<TSchema>[keyof AuthoritativeMutators]>
    >,
  >(
    schema: TSchema,
    authorizer: TAuthorizer,
    mutatorWithContext: (context: {
      authorized: Awaited<ReturnType<TAuthorizer>>;
    }) => TMutator,
  ) =>
  async (tx: Transaction, args: unknown) => {
    const output = v.parse(schema, args);

    const authorized = await Promise.resolve(authorizer(tx, output));

    const mutator = mutatorWithContext({ authorized });

    return mutator(tx, output);
  };

const updateOrganization = (user: LuciaUser) =>
  buildMutator(
    UpdateOrganizationMutationArgs,
    () => authorizeRole("updateOrganization", user),
    () => async (tx, values) => {
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
    UpdateUserRoleMutationArgs,
    () => authorizeRole("updateUserRole", user),
    () =>
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
    DeleteUserMutationArgs,
    (_tx, { id: userId }) => {
      const isRoleAuthorized = authorizeRole("deleteUser", user, false);

      if (!isRoleAuthorized && userId !== user.id) throw new ForbiddenError();
    },
    () =>
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
    'Mutation "syncPapercutAccounts" is not implemented with replicache, call directly instead (PUT /api/integrations/papercut/accounts)',
  );
};

const deletePapercutAccount = (user: LuciaUser) =>
  buildMutator(
    DeletePapercutAccountMutationArgs,
    () => authorizeRole("deletePapercutAccount", user),
    () =>
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
          ...customers.map(({ customerId }) =>
            formatChannel("user", customerId),
          ),
          ...managers.map(({ managerId }) => formatChannel("user", managerId)),
        ];
      },
  );

const createPapercutAccountManagerAuthorization = (user: LuciaUser) =>
  buildMutator(
    CreatePapercutAccountManagerAuthorizationMutationArgs,
    () => authorizeRole("createPapercutAccountManagerAuthorization", user),
    () => async (tx, values) => {
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
    DeletePapercutAccountManagerAuthorizationMutationArgs,
    () => authorizeRole("deletePapercutAccountManagerAuthorization", user),
    () =>
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
    CreateRoomMutationArgs,
    () => authorizeRole("createRoom", user),
    () => async (tx, values) => {
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
    UpdateRoomMutationArgs,
    () => authorizeRole("updateRoom", user),
    () =>
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
    DeleteRoomMutationArgs,
    () => authorizeRole("deleteRoom", user),
    () =>
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
    CreateAnnouncementMutationArgs,
    () => authorizeRole("createAnnouncement", user),
    () => async (tx, values) => {
      await tx.insert(Announcement).values(values);

      return [formatChannel("org", user.orgId)];
    },
  );

const updateAnnouncement = (user: LuciaUser) =>
  buildMutator(
    UpdateAnnouncementMutationArgs,
    () => authorizeRole("updateAnnouncement", user),
    () =>
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
    DeleteAnnouncementMutationArgs,
    () => authorizeRole("deleteAnnouncement", user),
    () =>
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
    CreateProductMutationArgs,
    () => authorizeRole("createProduct", user),
    () => async (tx, values) => {
      await tx.insert(Product).values(values);

      return [formatChannel("org", user.orgId)];
    },
  );

const updateProduct = (user: LuciaUser) =>
  buildMutator(
    UpdateProductMutationArgs,
    () => authorizeRole("updateProduct", user),
    () =>
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
    DeleteProductMutationArgs,
    () => authorizeRole("deleteProduct", user),
    () =>
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
    CreateOrderMutationArgs,
    () => authorizeRole("createOrder", user),
    () => async (tx, values) => {
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
    UpdateOrderMutationArgs,
    async (tx, { id: orderId }) => {
      const usersWithAccess = await requireAccessToOrder(tx, user, orderId);

      return { usersWithAccess };
    },
    (context) =>
      async (tx, { id: orderId, ...values }) => {
        await tx
          .update(Order)
          .set(values)
          .where(and(eq(Order.id, orderId), eq(Order.orgId, user.orgId)));

        return context.authorized.usersWithAccess.map(({ id }) =>
          formatChannel("user", id),
        );
      },
  );

const deleteOrder = (user: LuciaUser) =>
  buildMutator(
    DeleteOrderMutationArgs,
    async (tx, { id: orderId }) => {
      const usersWithAccess = await requireAccessToOrder(tx, user, orderId);

      return { usersWithAccess };
    },
    (context) =>
      async (tx, { id: orderId, ...values }) => {
        await tx
          .update(Order)
          .set(values)
          .where(and(eq(Order.id, orderId), eq(Order.orgId, user.orgId)));

        return context.authorized.usersWithAccess.map(({ id }) =>
          formatChannel("user", id),
        );
      },
  );

const createComment = (user: LuciaUser) =>
  buildMutator(
    CreateCommentMutationArgs,
    async (tx, { id: orderId }) => {
      const usersWithAccess = await requireAccessToOrder(tx, user, orderId);

      return { usersWithAccess };
    },
    (context) => async (tx, values) => {
      await tx.insert(Comment).values(values);

      return context.authorized.usersWithAccess.map(({ id }) =>
        formatChannel("user", id),
      );
    },
  );

const updateComment = (user: LuciaUser) =>
  buildMutator(
    UpdateCommentMutationArgs,
    async (tx, { orderId }) => {
      const usersWithAccess = await requireAccessToOrder(tx, user, orderId);

      return { usersWithAccess };
    },
    (context) =>
      async (tx, { id: commentId, ...values }) => {
        await tx
          .update(Comment)
          .set(values)
          .where(and(eq(Comment.id, commentId), eq(Comment.orgId, user.orgId)));

        return context.authorized.usersWithAccess.map(({ id }) =>
          formatChannel("user", id),
        );
      },
  );

const deleteComment = (user: LuciaUser) =>
  buildMutator(
    DeleteCommentMutationArgs,
    async (tx, { orderId }) => {
      const usersWithAccess = await requireAccessToOrder(tx, user, orderId);

      return { usersWithAccess };
    },
    (context) =>
      async (tx, { id: commentId, ...values }) => {
        await tx
          .update(Comment)
          .set(values)
          .where(and(eq(Comment.id, commentId), eq(Comment.orgId, user.orgId)));

        return context.authorized.usersWithAccess.map(({ id }) =>
          formatChannel("user", id),
        );
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
