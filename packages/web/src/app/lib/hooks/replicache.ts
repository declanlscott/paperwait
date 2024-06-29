/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MissingContextProviderError } from "@paperwait/core/errors";
import { mutators } from "@paperwait/core/optimistic-mutators";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useAuthenticated } from "~/app/lib/hooks/auth";

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
  const { user } = useAuthenticated();

  const updateOrganization = useCallback(mutators.updateOrganization(user), [
    user,
  ]);

  const updateUserRole = useCallback(mutators.updateUserRole(user), [user]);

  const deleteUser = useCallback(mutators.deleteUser(user), [user]);

  const restoreUser = useCallback(mutators.restoreUser(user), [user]);

  const deletePapercutAccount = useCallback(
    mutators.deletePapercutAccount(user),
    [user],
  );

  const createPapercutAccountManagerAuthorization = useCallback(
    mutators.createPapercutAccountManagerAuthorization(user),
    [user],
  );

  const deletePapercutAccountManagerAuthorization = useCallback(
    mutators.deletePapercutAccountManagerAuthorization(user),
    [user],
  );

  const createRoom = useCallback(mutators.createRoom(user), [user]);

  const updateRoom = useCallback(mutators.updateRoom(user), [user]);

  const deleteRoom = useCallback(mutators.deleteRoom(user), [user]);

  const createAnnouncement = useCallback(mutators.createAnnouncement(user), [
    user,
  ]);

  const updateAnnouncement = useCallback(mutators.updateAnnouncement(user), [
    user,
  ]);

  const deleteAnnouncement = useCallback(mutators.deleteAnnouncement(user), [
    user,
  ]);

  const createProduct = useCallback(mutators.createProduct(user), [user]);

  const updateProduct = useCallback(mutators.updateProduct(user), [user]);

  const deleteProduct = useCallback(mutators.deleteProduct(user), [user]);

  const createOrder = useCallback(mutators.createOrder(user), [user]);

  const updateOrder = useCallback(mutators.updateOrder(user), [user]);

  const deleteOrder = useCallback(mutators.deleteOrder(user), [user]);

  const createComment = useCallback(mutators.createComment(user), [user]);

  const updateComment = useCallback(mutators.updateComment(user), [user]);

  const deleteComment = useCallback(mutators.deleteComment(user), [user]);

  return useMemo(
    () => ({
      // Organization
      updateOrganization,

      // User
      updateUserRole,
      deleteUser,
      restoreUser,

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
      updateUserRole,
      deleteUser,
      restoreUser,
      deletePapercutAccount,
      createPapercutAccountManagerAuthorization,
      deletePapercutAccountManagerAuthorization,
      createRoom,
      updateRoom,
      deleteRoom,
      createAnnouncement,
      deleteAnnouncement,
      updateAnnouncement,
      createProduct,
      deleteProduct,
      updateProduct,
      createOrder,
      updateOrder,
      deleteOrder,
      createComment,
      deleteComment,
      updateComment,
    ],
  );
}

export type Mutators = ReturnType<typeof useMutators>;
