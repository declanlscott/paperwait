import { useCallback, useContext, useMemo } from "react";
import { MissingContextProviderError } from "@paperwait/core/errors";
import { optimistic } from "@paperwait/core/mutations";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useAuthed } from "~/app/lib/hooks/auth";

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
} from "@paperwait/core/mutations";
import type { WriteTransaction } from "replicache";

export function useReplicache() {
  const context = useContext(ReplicacheContext);

  if (!context) throw new MissingContextProviderError("Replicache");

  return context.replicache;
}

export function useMutators() {
  const authed = useAuthed();

  const updateUserRole = useCallback(
    async (tx: WriteTransaction, args: UpdateUserRoleMutationArgs) =>
      optimistic.updateUserRole(tx, authed.user, args),
    [authed.user],
  );

  const deleteUser = useCallback(
    async (tx: WriteTransaction, args: DeleteUserMutationArgs) =>
      optimistic.deleteUser(tx, authed.user, args),
    [authed.user],
  );

  const deletePapercutAccount = useCallback(
    async (tx: WriteTransaction, args: DeletePapercutAccountMutationArgs) =>
      optimistic.deletePapercutAccount(tx, authed.user, args),
    [authed.user],
  );

  const createPapercutAccountManagerAuthorization = useCallback(
    async (
      tx: WriteTransaction,
      args: CreatePapercutAccountManagerAuthorizationMutationArgs,
    ) =>
      optimistic.createPapercutAccountManagerAuthorization(
        tx,
        authed.user,
        args,
      ),
    [authed.user],
  );

  const deletePapercutAccountManagerAuthorization = useCallback(
    async (
      tx: WriteTransaction,
      args: DeletePapercutAccountManagerAuthorizationMutationArgs,
    ) =>
      optimistic.deletePapercutAccountManagerAuthorization(
        tx,
        authed.user,
        args,
      ),
    [authed.user],
  );

  const createRoom = useCallback(
    async (tx: WriteTransaction, args: CreateRoomMutationArgs) =>
      optimistic.createRoom(tx, authed.user, args),
    [authed.user],
  );

  const updateRoom = useCallback(
    async (tx: WriteTransaction, args: UpdateRoomMutationArgs) =>
      optimistic.updateRoom(tx, authed.user, args),
    [authed.user],
  );

  const deleteRoom = useCallback(
    async (tx: WriteTransaction, args: DeleteRoomMutationArgs) =>
      optimistic.deleteRoom(tx, authed.user, args),
    [authed.user],
  );

  const createAnnouncement = useCallback(
    async (tx: WriteTransaction, args: CreateAnnouncementMutationArgs) =>
      optimistic.createAnnouncement(tx, authed.user, args),
    [authed.user],
  );

  const updateAnnouncement = useCallback(
    async (tx: WriteTransaction, args: UpdateAnnouncementMutationArgs) =>
      optimistic.updateAnnouncement(tx, authed.user, args),
    [authed.user],
  );

  const deleteAnnouncement = useCallback(
    async (tx: WriteTransaction, args: DeleteAnnouncementMutationArgs) =>
      optimistic.deleteAnnouncement(tx, authed.user, args),
    [authed.user],
  );

  const createProduct = useCallback(
    async (tx: WriteTransaction, args: CreateProductMutationArgs) =>
      optimistic.createProduct(tx, authed.user, args),
    [authed.user],
  );

  const updateProduct = useCallback(
    async (tx: WriteTransaction, args: UpdateProductMutationArgs) =>
      optimistic.updateProduct(tx, authed.user, args),
    [authed.user],
  );

  const deleteProduct = useCallback(
    async (tx: WriteTransaction, args: DeleteProductMutationArgs) =>
      optimistic.deleteProduct(tx, authed.user, args),
    [authed.user],
  );

  const createOrder = useCallback(
    async (tx: WriteTransaction, args: CreateOrderMutationArgs) =>
      optimistic.createOrder(tx, authed.user, args),
    [authed.user],
  );

  const updateOrder = useCallback(
    async (tx: WriteTransaction, args: UpdateOrderMutationArgs) =>
      optimistic.updateOrder(tx, authed.user, args),
    [authed.user],
  );

  const deleteOrder = useCallback(
    async (tx: WriteTransaction, args: DeleteOrderMutationArgs) =>
      optimistic.deleteOrder(tx, authed.user, args),
    [authed.user],
  );

  const createComment = useCallback(
    async (tx: WriteTransaction, args: CreateCommentMutationArgs) =>
      optimistic.createComment(tx, authed.user, args),
    [authed.user],
  );

  const updateComment = useCallback(
    async (tx: WriteTransaction, args: UpdateCommentMutationArgs) =>
      optimistic.updateComment(tx, authed.user, args),
    [authed.user],
  );

  const deleteComment = useCallback(
    async (tx: WriteTransaction, args: DeleteCommentMutationArgs) =>
      optimistic.deleteComment(tx, authed.user, args),
    [authed.user],
  );

  return useMemo(
    () => ({
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
    }),
    [
      createAnnouncement,
      createComment,
      createOrder,
      createPapercutAccountManagerAuthorization,
      createProduct,
      createRoom,
      deleteAnnouncement,
      deleteComment,
      deleteOrder,
      deletePapercutAccount,
      deletePapercutAccountManagerAuthorization,
      deleteProduct,
      deleteRoom,
      deleteUser,
      updateAnnouncement,
      updateComment,
      updateOrder,
      updateProduct,
      updateRoom,
      updateUserRole,
    ],
  );
}

export type Mutators = ReturnType<typeof useMutators>;
