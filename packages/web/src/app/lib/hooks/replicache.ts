/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MissingContextProviderError } from "@paperwait/core/errors";
import { optimistic } from "@paperwait/core/mutators";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useAuthed } from "~/app/lib/hooks/auth";

export function useReplicache() {
  const replicache = useContext(ReplicacheContext);

  if (!replicache) throw new MissingContextProviderError("Replicache");

  return replicache;
}

export function useIsSyncing() {
  const [isSyncing, setIsSyncing] = useState(false);

  const replicache = useReplicache();

  useEffect(() => {
    replicache.onSync = setIsSyncing;
  }, [replicache]);

  return isSyncing;
}

export function useMutators() {
  const authed = useAuthed();

  const updateOrganization = useCallback(
    optimistic.updateOrganization(authed.user),
    [authed.user],
  );

  const updateUserRole = useCallback(optimistic.updateUserRole(authed.user), [
    authed.user,
  ]);

  const deleteUser = useCallback(optimistic.deleteUser(authed.user), [
    authed.user,
  ]);

  const deletePapercutAccount = useCallback(
    optimistic.deletePapercutAccount(authed.user),
    [authed.user],
  );

  const createPapercutAccountManagerAuthorization = useCallback(
    optimistic.createPapercutAccountManagerAuthorization(authed.user),
    [authed.user],
  );

  const deletePapercutAccountManagerAuthorization = useCallback(
    optimistic.deletePapercutAccountManagerAuthorization(authed.user),
    [authed.user],
  );

  const createRoom = useCallback(optimistic.createRoom(authed.user), [
    authed.user,
  ]);

  const updateRoom = useCallback(optimistic.updateRoom(authed.user), [
    authed.user,
  ]);

  const deleteRoom = useCallback(optimistic.deleteRoom(authed.user), [
    authed.user,
  ]);

  const createAnnouncement = useCallback(
    optimistic.createAnnouncement(authed.user),
    [authed.user],
  );

  const updateAnnouncement = useCallback(
    optimistic.updateAnnouncement(authed.user),
    [authed.user],
  );

  const deleteAnnouncement = useCallback(
    optimistic.deleteAnnouncement(authed.user),
    [authed.user],
  );

  const createProduct = useCallback(optimistic.createProduct(authed.user), [
    authed.user,
  ]);

  const updateProduct = useCallback(optimistic.updateProduct(authed.user), [
    authed.user,
  ]);

  const deleteProduct = useCallback(optimistic.deleteProduct(authed.user), [
    authed.user,
  ]);

  const createOrder = useCallback(optimistic.createOrder(authed.user), [
    authed.user,
  ]);

  const updateOrder = useCallback(optimistic.updateOrder(authed.user), [
    authed.user,
  ]);

  const deleteOrder = useCallback(optimistic.deleteOrder(authed.user), [
    authed.user,
  ]);

  const createComment = useCallback(optimistic.createComment(authed.user), [
    authed.user,
  ]);

  const updateComment = useCallback(optimistic.updateComment(authed.user), [
    authed.user,
  ]);

  const deleteComment = useCallback(optimistic.deleteComment(authed.user), [
    authed.user,
  ]);

  return useMemo(
    () => ({
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
    }),
    [
      updateOrganization,
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
