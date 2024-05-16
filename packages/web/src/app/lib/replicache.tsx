import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "@tanstack/react-router";
import { Replicache } from "replicache";

import { useAuthActions, useAuthedContext } from "~/app/lib/auth";
import { useResource } from "~/app/lib/resource";

import type { PropsWithChildren } from "react";

type ReplicacheContext =
  | { status: "initializing"; replicache: null }
  | { status: "ready"; replicache: Replicache };

const ReplicacheContext = createContext<ReplicacheContext | null>(null);

export function ReplicacheProvider(props: PropsWithChildren) {
  const [replicache, setReplicache] = useState<ReplicacheContext | null>(
    () => ({
      status: "initializing",
      replicache: null,
    }),
  );

  const { user } = useAuthedContext();
  const { logout } = useAuthActions();

  const { ReplicacheLicenseKey, IsDev } = useResource();

  const { invalidate } = useRouter();

  const reauthenticate = useCallback(async () => {
    await logout();
    await invalidate();
    return null;
  }, [logout, invalidate]);

  useEffect(() => {
    const replicache = new Replicache({
      name: user.id,
      licenseKey: ReplicacheLicenseKey.value,
      // pushURL: `/api/replicache/push`,
      // pullURL: `/api/replicache/pull`,
      logLevel: IsDev.value === "true" ? "info" : "error",
    });

    replicache.getAuth = reauthenticate;

    setReplicache(() => ({ status: "ready", replicache }));

    return () => void replicache.close();
  }, [user.id, ReplicacheLicenseKey.value, IsDev.value, reauthenticate]);

  return (
    <ReplicacheContext.Provider value={replicache}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}

export function useReplicache() {
  const context = useContext(ReplicacheContext);

  if (!context)
    throw new Error("useReplicache must be used within a ReplicacheProvider");

  return context.replicache;
}
