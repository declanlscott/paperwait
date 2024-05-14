import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Replicache } from "replicache";

import { useAuthedContext } from "~/app/lib/auth";
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

  const { user, org } = useAuthedContext();

  const { ReplicacheLicenseKey, IsDev } = useResource();

  const navigate = useNavigate();

  useEffect(() => {
    const replicache = new Replicache({
      name: user.id,
      licenseKey: ReplicacheLicenseKey.value,
      // pushURL: `/api/replicache/push`,
      // pullURL: `/api/replicache/pull`,
      logLevel: IsDev.value === "true" ? "info" : "error",
    });

    replicache.getAuth = async () => {
      await navigate({ to: "/login", search: { org: org.slug } });
      return null;
    };

    setReplicache(() => ({ status: "ready", replicache }));

    return () => void replicache.close();
  }, [user.id, ReplicacheLicenseKey.value, IsDev.value, navigate, org.slug]);

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
