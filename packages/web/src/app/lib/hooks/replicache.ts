/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MissingContextProviderError } from "@paperwait/core/errors";
import { mutators } from "@paperwait/core/optimistic-mutators";

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
    mutators.updateOrganization(authed.user),
    [authed.user],
  );

  const updateUserRole = useCallback(mutators.updateUserRole(authed.user), [
    authed.user,
  ]);

  const deleteUser = useCallback(mutators.deleteUser(authed.user), [
    authed.user,
  ]);

  const deletePapercutAccount = useCallback(
    mutators.deletePapercutAccount(authed.user),
    [authed.user],
  );

  const createPapercutAccountManagerAuthorization = useCallback(
    mutators.createPapercutAccountManagerAuthorization(authed.user),
    [authed.user],
  );

  const deletePapercutAccountManagerAuthorization = useCallback(
    mutators.deletePapercutAccountManagerAuthorization(authed.user),
    [authed.user],
  );

  const createRoom = useCallback(mutators.createRoom(authed.user), [
    authed.user,
  ]);

  const updateRoom = useCallback(mutators.updateRoom(authed.user), [
    authed.user,
  ]);

  const deleteRoom = useCallback(mutators.deleteRoom(authed.user), [
    authed.user,
  ]);

  const createAnnouncement = useCallback(
    mutators.createAnnouncement(authed.user),
    [authed.user],
  );

  const updateAnnouncement = useCallback(
    mutators.updateAnnouncement(authed.user),
    [authed.user],
  );

  const deleteAnnouncement = useCallback(
    mutators.deleteAnnouncement(authed.user),
    [authed.user],
  );

  const createProduct = useCallback(mutators.createProduct(authed.user), [
    authed.user,
  ]);

  const updateProduct = useCallback(mutators.updateProduct(authed.user), [
    authed.user,
  ]);

  const deleteProduct = useCallback(mutators.deleteProduct(authed.user), [
    authed.user,
  ]);

  const createOrder = useCallback(mutators.createOrder(authed.user), [
    authed.user,
  ]);

  const updateOrder = useCallback(mutators.updateOrder(authed.user), [
    authed.user,
  ]);

  const deleteOrder = useCallback(mutators.deleteOrder(authed.user), [
    authed.user,
  ]);

  const createComment = useCallback(mutators.createComment(authed.user), [
    authed.user,
  ]);

  const updateComment = useCallback(mutators.updateComment(authed.user), [
    authed.user,
  ]);

  const deleteComment = useCallback(mutators.deleteComment(authed.user), [
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
