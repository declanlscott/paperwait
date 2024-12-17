import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Announcements } from "@printworks/core/announcements/client";
import { BillingAccounts } from "@printworks/core/billing-accounts/client";
import { Comments } from "@printworks/core/comments/client";
import { Invoices } from "@printworks/core/invoices/client";
import { Orders } from "@printworks/core/orders/client";
import { Products } from "@printworks/core/products/client";
import { Rooms } from "@printworks/core/rooms/client";
import { Tenants } from "@printworks/core/tenants/client";
import { Users } from "@printworks/core/users/client";
import { ApplicationError } from "@printworks/core/utils/errors";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useActor } from "~/app/lib/hooks/actor";

import type { Replicache } from "@printworks/core/replicache/client";
import type { MutationName } from "@printworks/core/replicache/shared";
import type { User } from "@printworks/core/users/sql";
import type { ReadTransaction, SubscribeOptions } from "replicache";

export function useReplicache() {
  const replicache = useContext(ReplicacheContext);

  if (!replicache)
    throw new ApplicationError.MissingContextProvider("Replicache");
  if (replicache.status !== "ready")
    throw new ApplicationError.Error("Replicache is not in ready state");

  return replicache;
}

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
  const replicache = useReplicache();

  const [data, setData] = useState<TData>();

  useEffect(() => {
    const unsubscribe = replicache.client.subscribe(query, {
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
  }, [replicache.client]);

  if (!data) return defaultData as TDefaultData;

  return data;
}

export function useIsSyncing() {
  const [isSyncing, setIsSyncing] = useState(() => false);

  const replicache = useReplicache();

  useEffect(() => {
    replicache.client.onSync = setIsSyncing;
  }, [replicache]);

  return isSyncing;
}

export function useMutators() {
  const actor = useActor();

  const getMutator = useCallback(
    <
      TMutator extends (
        userId: User["id"],
      ) => (
        ...params: Parameters<ReturnType<TMutator>>
      ) => ReturnType<ReturnType<TMutator>>,
    >(
      mutator: TMutator,
    ) =>
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      actor.type === "user" ? mutator(actor.properties.id) : async () => {},
    [actor],
  );

  return useMemo(
    () => ({
      createAnnouncement: getMutator(Announcements.create),
      updateAnnouncement: getMutator(Announcements.update),
      deleteAnnouncement: getMutator(Announcements.delete_),
      updateBillingAccountReviewThreshold: getMutator(
        BillingAccounts.updateReviewThreshold,
      ),
      deleteBillingAccount: getMutator(BillingAccounts.delete_),
      createBillingAccountManagerAuthorization: getMutator(
        BillingAccounts.createManagerAuthorization,
      ),
      deleteBillingAccountManagerAuthorization: getMutator(
        BillingAccounts.deleteManagerAuthorization,
      ),
      createComment: getMutator(Comments.create),
      updateComment: getMutator(Comments.update),
      deleteComment: getMutator(Comments.delete_),
      setDeliveryOptions: getMutator(Rooms.setDeliveryOptions),
      createInvoice: getMutator(Invoices.create),
      createOrder: getMutator(Orders.create),
      updateOrder: getMutator(Orders.update),
      deleteOrder: getMutator(Orders.delete_),
      updateTenant: getMutator(Tenants.update),
      createProduct: getMutator(Products.create),
      updateProduct: getMutator(Products.update),
      deleteProduct: getMutator(Products.delete_),
      createRoom: getMutator(Rooms.create),
      updateRoom: getMutator(Rooms.update),
      deleteRoom: getMutator(Rooms.delete_),
      restoreRoom: getMutator(Rooms.restore),
      updateUserProfileRole: getMutator(Users.updateProfileRole),
      deleteUserProfile: getMutator(Users.deleteProfile),
      restoreUserProfile: getMutator(Users.restoreProfile),
      setWorkflow: getMutator(Rooms.setWorkflow),
    }),
    [getMutator],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) satisfies Record<MutationName, Replicache.OptimisticMutator<any>>;
}

export type Mutators = ReturnType<typeof useMutators>;
