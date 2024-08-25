import { and, eq } from "drizzle-orm";
import * as v from "valibot";

import { Announcement } from "../announcement/announcement.sql";
import { useAuthenticated } from "../auth";
import { lucia } from "../auth/lucia";
import { Comment } from "../comment/comment.sql";
import {
  getUsersByRoles,
  getUsersWithAccessToOrder,
  requireAccessToOrder,
} from "../data/get";
import { ForbiddenError, NotImplementedError } from "../errors/http";
import { Order } from "../order/order.sql";
import { Organization } from "../organization";
import { useTransaction } from "../orm/transaction";
import {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { Product } from "../product/product.sql";
import { formatChannel } from "../realtime";
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
  mutatorRbac,
  RestoreRoomMutationArgs,
  RestoreUserMutationArgs,
  UpdateAnnouncementMutationArgs,
  UpdateCommentMutationArgs,
  UpdateOrderMutationArgs,
  UpdateOrganizationMutationArgs,
  UpdateProductMutationArgs,
  UpdateRoomMutationArgs,
  UpdateUserRoleMutationArgs,
} from "../schemas/mutators";
import { User } from "../user/user.sql";
import { enforceRbac } from "../utils";

import type { AuthoritativeMutators } from "../schemas/mutators";

const authorizeRole = (
  mutationName: keyof typeof mutatorRbac,
  shouldThrow = true,
) => {
  const { user } = useAuthenticated();

  const isRoleAuthorized = enforceRbac(
    user,
    mutatorRbac[mutationName],
    shouldThrow ? ForbiddenError : undefined,
  );

  if (!isRoleAuthorized && shouldThrow) throw new ForbiddenError();

  return isRoleAuthorized;
};

const buildMutator =
  <
    TSchema extends v.GenericSchema,
    TAuthorizer extends (
      values: v.InferOutput<TSchema>,
    ) => ReturnType<TAuthorizer>,
    TMutator extends (
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
  async (args: unknown) => {
    const output = v.parse(schema, args);

    const authorized = await Promise.resolve(authorizer(output));

    const mutator = mutatorWithContext({ authorized });

    return mutator(output);
  };

const updateOrganization = () =>
  buildMutator(
    UpdateOrganizationMutationArgs,
    () => authorizeRole("updateOrganization"),
    () => async (values) =>
      await useTransaction(async (tx) => {
        const { org } = useAuthenticated();

        await tx
          .update(Organization)
          .set(values)
          .where(eq(Organization.id, org.id));

        if (values.status === "suspended") {
          const nonAdmins = await getUsersByRoles([
            "administrator",
            "operator",
          ]).then((users) =>
            users.filter(({ role }) => role !== "administrator"),
          );

          await Promise.all(
            nonAdmins.map(({ id }) => lucia.invalidateUserSessions(id)),
          );
        }

        return [formatChannel("org", org.id)];
      }),
  );

const updateUserRole = () =>
  buildMutator(
    UpdateUserRoleMutationArgs,
    () => authorizeRole("updateUserRole"),
    () =>
      async ({ id: userId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(User)
            .set(values)
            .where(and(eq(User.id, userId), eq(User.orgId, org.id)));

          return [formatChannel("org", org.id)];
        }),
  );

const deleteUser = () =>
  buildMutator(
    DeleteUserMutationArgs,
    ({ id: userId }) => {
      const isRoleAuthorized = authorizeRole("deleteUser", false);

      if (!isRoleAuthorized && userId !== useAuthenticated().user.id)
        throw new ForbiddenError();
    },
    () =>
      async ({ id: userId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(User)
            .set(values)
            .where(and(eq(User.id, userId), eq(User.orgId, org.id)));

          await lucia.invalidateUserSessions(userId);

          return [formatChannel("org", org.id)];
        }),
  );

const restoreUser = () =>
  buildMutator(
    RestoreUserMutationArgs,
    () => authorizeRole("restoreUser"),
    () =>
      async ({ id: userId }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(User)
            .set({ deletedAt: null })
            .where(and(eq(User.id, userId), eq(User.orgId, org.id)));

          return [formatChannel("org", org.id)];
        }),
  );

const syncPapercutAccounts = () => {
  throw new NotImplementedError(
    'Mutation "syncPapercutAccounts" is not implemented with replicache, call directly instead (PUT /api/integrations/papercut/accounts)',
  );
};

const deletePapercutAccount = () =>
  buildMutator(
    DeletePapercutAccountMutationArgs,
    () => authorizeRole("deletePapercutAccount"),
    () =>
      async ({ id: papercutAccountId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          const [adminsOps, managers, customers] = await Promise.all([
            getUsersByRoles(["administrator", "operator"]),
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
                  eq(PapercutAccountManagerAuthorization.orgId, org.id),
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
                  eq(PapercutAccountCustomerAuthorization.orgId, org.id),
                ),
              ),
            tx
              .update(PapercutAccount)
              .set(values)
              .where(
                and(
                  eq(PapercutAccount.id, papercutAccountId),
                  eq(PapercutAccount.orgId, org.id),
                ),
              ),
          ]);

          return [
            ...adminsOps.map(({ id }) => formatChannel("user", id)),
            ...customers.map(({ customerId }) =>
              formatChannel("user", customerId),
            ),
            ...managers.map(({ managerId }) =>
              formatChannel("user", managerId),
            ),
          ];
        }),
  );

const createPapercutAccountManagerAuthorization = () =>
  buildMutator(
    CreatePapercutAccountManagerAuthorizationMutationArgs,
    () => authorizeRole("createPapercutAccountManagerAuthorization"),
    () => async (values) =>
      await useTransaction(async (tx) => {
        const { org } = useAuthenticated();

        const managerAuthorization = await tx
          .insert(PapercutAccountManagerAuthorization)
          .values(values)
          .onConflictDoNothing()
          .returning({ id: PapercutAccountManagerAuthorization.id })
          .then((rows) => rows.at(0));
        if (!managerAuthorization) return [];

        return [formatChannel("org", org.id)];
      }),
  );

const deletePapercutAccountManagerAuthorization = () =>
  buildMutator(
    DeletePapercutAccountManagerAuthorizationMutationArgs,
    () => authorizeRole("deletePapercutAccountManagerAuthorization"),
    () =>
      async ({ id: papercutAccountManagerAuthorizationId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(PapercutAccountManagerAuthorization)
            .set(values)
            .where(
              and(
                eq(
                  PapercutAccountManagerAuthorization.id,
                  papercutAccountManagerAuthorizationId,
                ),
                eq(PapercutAccountManagerAuthorization.orgId, org.id),
              ),
            );

          return [formatChannel("org", org.id)];
        }),
  );

const createRoom = () =>
  buildMutator(
    CreateRoomMutationArgs,
    () => authorizeRole("createRoom"),
    () => async (values) =>
      await useTransaction(async (tx) => {
        const { org } = useAuthenticated();

        const room = await tx
          .insert(Room)
          .values(values)
          .onConflictDoNothing()
          .returning({ id: Room.id })
          .then((rows) => rows.at(0));
        if (!room) return [];

        return [formatChannel("org", org.id)];
      }),
  );

const updateRoom = () =>
  buildMutator(
    UpdateRoomMutationArgs,
    () => authorizeRole("updateRoom"),
    () =>
      async ({ id: roomId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(Room)
            .set(values)
            .where(and(eq(Room.id, roomId), eq(Room.orgId, org.id)));

          return [formatChannel("org", org.id)];
        }),
  );

const deleteRoom = () =>
  buildMutator(
    DeleteRoomMutationArgs,
    () => authorizeRole("deleteRoom"),
    () =>
      async ({ id: roomId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await Promise.all([
            tx
              .update(Room)
              .set({ ...values, status: "draft" })
              .where(and(eq(Room.id, roomId), eq(Room.orgId, org.id))),
            // Set all products in the room to draft
            tx
              .update(Product)
              .set({ status: "draft" })
              .where(
                and(eq(Product.roomId, roomId), eq(Product.orgId, org.id)),
              ),
          ]);

          return [formatChannel("org", org.id)];
        }),
  );

const restoreRoom = () =>
  buildMutator(
    RestoreRoomMutationArgs,
    () => authorizeRole("restoreRoom"),
    () =>
      async ({ id: roomId }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(Room)
            .set({ deletedAt: null })
            .where(and(eq(Room.id, roomId), eq(Room.orgId, org.id)));

          return [formatChannel("org", org.id)];
        }),
  );

const createAnnouncement = () =>
  buildMutator(
    CreateAnnouncementMutationArgs,
    () => authorizeRole("createAnnouncement"),
    () => async (values) =>
      await useTransaction(async (tx) => {
        const { org } = useAuthenticated();

        await tx.insert(Announcement).values(values);

        return [formatChannel("org", org.id)];
      }),
  );

const updateAnnouncement = () =>
  buildMutator(
    UpdateAnnouncementMutationArgs,
    () => authorizeRole("updateAnnouncement"),
    () =>
      async ({ id: announcementId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(Announcement)
            .set(values)
            .where(
              and(
                eq(Announcement.id, announcementId),
                eq(Announcement.orgId, org.id),
              ),
            );

          return [formatChannel("org", org.id)];
        }),
  );

const deleteAnnouncement = () =>
  buildMutator(
    DeleteAnnouncementMutationArgs,
    () => authorizeRole("deleteAnnouncement"),
    () =>
      async ({ id: announcementId, ...values }) =>
        useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(Announcement)
            .set(values)
            .where(
              and(
                eq(Announcement.id, announcementId),
                eq(Announcement.orgId, org.id),
              ),
            );

          return [formatChannel("org", org.id)];
        }),
  );

const createProduct = () =>
  buildMutator(
    CreateProductMutationArgs,
    () => authorizeRole("createProduct"),
    () => async (values) =>
      await useTransaction(async (tx) => {
        const { org } = useAuthenticated();

        await tx.insert(Product).values(values);

        return [formatChannel("org", org.id)];
      }),
  );

const updateProduct = () =>
  buildMutator(
    UpdateProductMutationArgs,
    () => authorizeRole("updateProduct"),
    () =>
      async ({ id: productId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(Product)
            .set(values)
            .where(and(eq(Product.id, productId), eq(Product.orgId, org.id)));

          return [formatChannel("org", org.id)];
        }),
  );

const deleteProduct = () =>
  buildMutator(
    DeleteProductMutationArgs,
    () => authorizeRole("deleteProduct"),
    () =>
      async ({ id: productId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(Product)
            .set(values)
            .where(and(eq(Product.id, productId), eq(Product.orgId, org.id)));

          return [formatChannel("org", org.id)];
        }),
  );

const createOrder = () =>
  buildMutator(
    CreateOrderMutationArgs,
    () => authorizeRole("createOrder"),
    () => async (values) =>
      await useTransaction(async (tx) => {
        const order = await tx
          .insert(Order)
          .values(values)
          .returning({ id: Order.id })
          .then((rows) => rows.at(0));
        if (!order) throw new Error("Failed to create order");

        const users = await getUsersWithAccessToOrder(order.id);

        return users.map(({ id }) => formatChannel("user", id));
      }),
  );

const updateOrder = () =>
  buildMutator(
    UpdateOrderMutationArgs,
    async ({ id: orderId }) => {
      const usersWithAccess = await requireAccessToOrder(orderId);

      return { usersWithAccess };
    },
    (context) =>
      async ({ id: orderId, ...values }) =>
        useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(Order)
            .set(values)
            .where(and(eq(Order.id, orderId), eq(Order.orgId, org.id)));

          return context.authorized.usersWithAccess.map(({ id }) =>
            formatChannel("user", id),
          );
        }),
  );

const deleteOrder = () =>
  buildMutator(
    DeleteOrderMutationArgs,
    async ({ id: orderId }) => {
      const usersWithAccess = await requireAccessToOrder(orderId);

      return { usersWithAccess };
    },
    (context) =>
      async ({ id: orderId, ...values }) =>
        await useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(Order)
            .set(values)
            .where(and(eq(Order.id, orderId), eq(Order.orgId, org.id)));

          return context.authorized.usersWithAccess.map(({ id }) =>
            formatChannel("user", id),
          );
        }),
  );

const createComment = () =>
  buildMutator(
    CreateCommentMutationArgs,
    async ({ orderId }) => {
      const usersWithAccess = await requireAccessToOrder(orderId);

      return { usersWithAccess };
    },
    (context) => async (values) =>
      await useTransaction(async (tx) => {
        await tx.insert(Comment).values(values);

        return context.authorized.usersWithAccess.map(({ id }) =>
          formatChannel("user", id),
        );
      }),
  );

const updateComment = () =>
  buildMutator(
    UpdateCommentMutationArgs,
    async ({ orderId }) => {
      const usersWithAccess = await requireAccessToOrder(orderId);

      return { usersWithAccess };
    },
    (context) =>
      async ({ id: commentId, ...values }) =>
        useTransaction(async (tx) => {
          const { org } = useAuthenticated();

          await tx
            .update(Comment)
            .set(values)
            .where(and(eq(Comment.id, commentId), eq(Comment.orgId, org.id)));

          return context.authorized.usersWithAccess.map(({ id }) =>
            formatChannel("user", id),
          );
        }),
  );

const deleteComment = () =>
  buildMutator(
    DeleteCommentMutationArgs,
    async ({ orderId }) => {
      const usersWithAccess = await requireAccessToOrder(orderId);

      return { usersWithAccess };
    },
    (context) =>
      async ({ id: commentId, ...values }) =>
        await useTransaction(async (tx) => {
          await tx.update(Comment).set(values).where(eq(Comment.id, commentId));

          return context.authorized.usersWithAccess.map(({ id }) =>
            formatChannel("user", id),
          );
        }),
  );

export const mutators = {
  // Organization
  updateOrganization,

  // User
  updateUserRole,
  deleteUser,
  restoreUser,

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
  restoreRoom,

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
