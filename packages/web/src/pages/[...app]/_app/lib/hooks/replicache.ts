import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Announcements } from "@paperwait/core/announcements/client";
import { ApplicationError } from "@paperwait/core/utils/errors";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useAuthenticated } from "~/app/lib/hooks/auth";

import type { Authenticated } from "@paperwait/core/sessions/shared";
import type {
  ReadTransaction,
  SubscribeOptions,
  WriteTransaction,
} from "replicache";

export function useReplicache() {
  const replicache = useContext(ReplicacheContext);

  if (!replicache)
    throw new ApplicationError.MissingContextProvider("Replicache");

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

export function useMutatorFactory(user: Authenticated["user"]) {
  const test = Announcements.create(user)({} as WriteTransaction, {});

  // const withUser = useCallback(
  //   <TMutator extends OptimisticMutatorWithUser>(
  //     user: Authenticated["user"],
  //     mutator: TMutator,
  //     // eslint-disable-next-line @typescript-eslint/no-empty-function
  //   ) => (user ? mutator(user) : async () => {}),
  //   [],
  // );

  // const createAnnouncement = useMemo(
  //   () => withUser(user, Announcement.create),
  //   [withUser, user],
  // );

  // return useMemo(
  //   () => ({ createAnnouncement }) satisfies OptimisticMutatorFactory,
  //   [createAnnouncement],
  // );
}

export type Mutators = ReturnType<typeof useMutators>;

// function useTest() {
//   const { user } = useAuthenticated();

//   const { createAnnouncement } = useMutatorFactory(user);
// }
