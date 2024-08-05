import { useCallback, useEffect, useMemo, useState } from "react";
import { mutators } from "@paperwait/core/client-optimism";

import { useAuthenticated } from "~/app/lib/hooks/auth";

import type { ReadTransaction, SubscribeOptions } from "replicache";

export interface UseSubscribeOptions<TData, TDefaultData>
  extends Partial<SubscribeOptions<TData>> {
  defaultData?: TDefaultData;
}

export function useSubscribe<TData, TDefaultData = undefined>(
  query: (tx: ReadTransaction) => Promise<TData>,
  {
    onData,
    onError,
    onDone,
    isEqual,
    defaultData,
  }: UseSubscribeOptions<TData, TDefaultData> = {},
): TData | TDefaultData {
  const { replicache } = useAuthenticated();

  const [data, setData] = useState<TData>();

  useEffect(() => {
    const unsubscribe = replicache.subscribe(query, {
      onData: (data) => {
        setData(() => data);

        onData?.(data);
      },
      onError,
      onDone,
      isEqual,
    });

    return () => {
      unsubscribe();
      setData(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replicache]);

  if (!data) return defaultData as TDefaultData;

  return data;
}

export function useIsSyncing() {
  const [isSyncing, setIsSyncing] = useState(() => false);

  const { replicache } = useAuthenticated();

  useEffect(() => {
    replicache.onSync = setIsSyncing;
  }, [replicache]);

  return isSyncing;
}

export function useMutators(user: App.Locals["user"]) {
  const withUser = useCallback(
    <
      TMutator extends (
        user: NonNullable<App.Locals["user"]>,
      ) => (
        ...params: Parameters<ReturnType<TMutator>>
      ) => ReturnType<ReturnType<TMutator>>,
    >(
      user: App.Locals["user"],
      mutator: TMutator,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
    ) => (user ? mutator(user) : () => {}),
    [],
  );

  const updateOrganization = useMemo(
    () => withUser(user, mutators.updateOrganization),
    [withUser, user],
  );

  const updateUserRole = useMemo(
    () => withUser(user, mutators.updateUserRole),
    [withUser, user],
  );

  const deleteUser = useMemo(
    () => withUser(user, mutators.deleteUser),
    [withUser, user],
  );

  const restoreUser = useMemo(
    () => withUser(user, mutators.restoreUser),
    [withUser, user],
  );

  const deletePapercutAccount = useMemo(
    () => withUser(user, mutators.deletePapercutAccount),
    [withUser, user],
  );

  const createPapercutAccountManagerAuthorization = useMemo(
    () => withUser(user, mutators.createPapercutAccountManagerAuthorization),
    [withUser, user],
  );

  const deletePapercutAccountManagerAuthorization = useMemo(
    () => withUser(user, mutators.deletePapercutAccountManagerAuthorization),
    [withUser, user],
  );

  const createRoom = useMemo(
    () => withUser(user, mutators.createRoom),
    [withUser, user],
  );

  const updateRoom = useMemo(
    () => withUser(user, mutators.updateRoom),
    [withUser, user],
  );

  const deleteRoom = useMemo(
    () => withUser(user, mutators.deleteRoom),
    [withUser, user],
  );

  const restoreRoom = useMemo(
    () => withUser(user, mutators.restoreRoom),
    [withUser, user],
  );

  const createAnnouncement = useMemo(
    () => withUser(user, mutators.createAnnouncement),
    [withUser, user],
  );

  const updateAnnouncement = useMemo(
    () => withUser(user, mutators.updateAnnouncement),
    [withUser, user],
  );

  const deleteAnnouncement = useMemo(
    () => withUser(user, mutators.deleteAnnouncement),
    [withUser, user],
  );

  const createProduct = useMemo(
    () => withUser(user, mutators.createProduct),
    [withUser, user],
  );

  const updateProduct = useMemo(
    () => withUser(user, mutators.updateProduct),
    [withUser, user],
  );

  const deleteProduct = useMemo(
    () => withUser(user, mutators.deleteProduct),
    [withUser, user],
  );

  const createOrder = useMemo(
    () => withUser(user, mutators.createOrder),
    [withUser, user],
  );

  const updateOrder = useMemo(
    () => withUser(user, mutators.updateOrder),
    [withUser, user],
  );

  const deleteOrder = useMemo(
    () => withUser(user, mutators.deleteOrder),
    [withUser, user],
  );

  const createComment = useMemo(
    () => withUser(user, mutators.createComment),
    [withUser, user],
  );

  const updateComment = useMemo(
    () => withUser(user, mutators.updateComment),
    [withUser, user],
  );

  const deleteComment = useMemo(
    () => withUser(user, mutators.deleteComment),
    [withUser, user],
  );

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
      restoreRoom,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      createProduct,
      updateProduct,
      deleteProduct,
      createOrder,
      updateOrder,
      deleteOrder,
      createComment,
      updateComment,
      deleteComment,
    ],
  );
}

export type Mutators = ReturnType<typeof useMutators>;
