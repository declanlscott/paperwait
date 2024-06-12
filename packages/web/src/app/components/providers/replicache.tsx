import { useEffect, useState } from "react";
import { Replicache } from "replicache";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useAuthed, useLogout } from "~/app/lib/hooks/auth";
import { useMutators } from "~/app/lib/hooks/replicache";
import { useResource } from "~/app/lib/hooks/resource";
import { useSlot } from "~/app/lib/hooks/slot";

import type { PropsWithChildren } from "react";

export function ReplicacheProvider(props: PropsWithChildren) {
  const [replicache, setReplicache] = useState<ReplicacheContext | null>(null);

  const { user } = useAuthed();

  const { ReplicacheLicenseKey, IsDev } = useResource();

  const mutators = useMutators();

  const logout = useLogout();

  useEffect(() => {
    const replicache = new Replicache({
      name: user.id,
      licenseKey: ReplicacheLicenseKey.value,
      mutators,
      pushURL: "/api/replicache/push",
      pullURL: "/api/replicache/pull",
      logLevel: IsDev.value === "true" ? "info" : "error",
    });

    replicache.getAuth = async () => {
      await logout();
      return null;
    };

    setReplicache(() => replicache);

    return () => void replicache.close();
  }, [user.id, ReplicacheLicenseKey.value, IsDev.value, mutators, logout]);

  const { loadingIndicator } = useSlot();

  if (!replicache) return <>{loadingIndicator}</>;

  return (
    <ReplicacheContext.Provider value={replicache}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}
