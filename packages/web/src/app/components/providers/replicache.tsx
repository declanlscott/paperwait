import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Replicache } from "replicache";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useAuthActions, useAuthenticated } from "~/app/lib/hooks/auth";
import { useMutators } from "~/app/lib/hooks/replicache";
import { useResource } from "~/app/lib/hooks/resource";
import { useSlot } from "~/app/lib/hooks/slot";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { PropsWithChildren } from "react";
import type { Organization } from "@paperwait/core/organization";

export function ReplicacheProvider(props: PropsWithChildren) {
  const [replicache, setReplicache] = useState<ReplicacheContext | null>(null);

  const { user } = useAuthenticated();

  const { ReplicacheLicenseKey, IsDev } = useResource();

  const mutators = useMutators();

  const { logout } = useAuthActions();

  const { invalidate, navigate } = useRouter();

  const handleLogout = useCallback(
    async (replicache: ReplicacheContext) => {
      await logout();

      const org = await replicache.query((tx) =>
        tx
          .scan<Organization>({ prefix: "organization/" })
          .toArray()
          .then((values) => values.at(0)),
      );

      await invalidate().finally(
        () =>
          void navigate({
            to: "/login",
            search: org?.slug
              ? { ...initialLoginSearchParams, org: org.slug }
              : initialLoginSearchParams,
          }),
      );

      return null;
    },
    [invalidate, logout, navigate],
  );

  useEffect(() => {
    const replicache = new Replicache({
      name: user.id,
      licenseKey: ReplicacheLicenseKey.value,
      mutators,
      pushURL: "/api/replicache/push",
      pullURL: "/api/replicache/pull",
      logLevel: IsDev.value === "true" ? "info" : "error",
    });

    replicache.getAuth = () => handleLogout(replicache);

    setReplicache(() => replicache);

    return () => void replicache.close();
  }, [
    user.id,
    ReplicacheLicenseKey.value,
    IsDev.value,
    mutators,
    handleLogout,
  ]);

  const { loadingIndicator } = useSlot();

  if (!replicache) return loadingIndicator;

  return (
    <ReplicacheContext.Provider value={replicache}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}
