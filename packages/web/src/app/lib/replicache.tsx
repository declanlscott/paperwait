import { createContext, useContext, useEffect, useState } from "react";
import { Replicache } from "replicache";

import { useAuthedContext } from "~/app/lib/auth";
import { useResource } from "~/app/lib/resource";

import type { PropsWithChildren } from "react";

type ReplicacheContext = Replicache;

const ReplicacheContext = createContext<Replicache | null>(null);

export function ReplicacheProvider(props: PropsWithChildren) {
  const [replicache, setReplicache] = useState<Replicache | null>(null);

  const { user } = useAuthedContext();

  const { ReplicacheLicenseKey, IsDev } = useResource();

  useEffect(() => {
    const replicache = new Replicache({
      name: user.id,
      licenseKey: ReplicacheLicenseKey.value,
      //   pushURL: `/api/replicache/push?userId=${user.id}`,
      //   pullURL: `/api/replicache/pull?userId=${user.id}`,
      logLevel: IsDev.value === "true" ? "info" : "error",
    });

    setReplicache(() => replicache);

    return () => void replicache.close();
  }, [user.id, ReplicacheLicenseKey.value, IsDev.value]);

  return (
    <ReplicacheContext.Provider value={replicache}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}

export function useReplicache() {
  const replicache = useContext(ReplicacheContext);

  if (!replicache) {
    throw new Error("useReplicache must be used within a ReplicacheProvider");
  }

  return replicache;
}
