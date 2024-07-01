import { useCallback, useEffect, useState } from "react";
import { Replicache } from "replicache";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useAuth, useAuthActions } from "~/app/lib/hooks/auth";
import { queryFactory } from "~/app/lib/hooks/data";
import { useMutators } from "~/app/lib/hooks/replicache";
import { useResource } from "~/app/lib/hooks/resource";
import { useSlot } from "~/app/lib/hooks/slot";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { PropsWithChildren } from "react";
import type { Mutators } from "~/app/lib/hooks/replicache";
import type { AppRouter } from "~/app/types";

export interface ReplicacheProviderProps extends PropsWithChildren {
  router: AppRouter;
}
export function ReplicacheProvider(props: ReplicacheProviderProps) {
  const { invalidate, navigate } = props.router;

  const [context, setContext] = useState<ReplicacheContext | null>(null);

  const { user } = useAuth();

  const { ReplicacheLicenseKey, IsDev } = useResource();

  const mutators = useMutators();

  const { reset } = useAuthActions();

  const resetAuth = useCallback(
    async (replicache: Replicache<Mutators>) => {
      reset();

      const org = await replicache.query(queryFactory.organization);

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
    [reset, invalidate, navigate],
  );

  useEffect(() => {
    if (user?.id) {
      const replicache = new Replicache({
        name: user.id,
        licenseKey: ReplicacheLicenseKey.value,
        mutators,
        pushURL: "/api/replicache/push",
        pullURL: "/api/replicache/pull",
        logLevel: IsDev.value === "true" ? "info" : "error",
      });

      replicache.getAuth = () => resetAuth(replicache);

      setContext(() => ({
        status: "authenticated",
        client: replicache,
      }));

      return () => {
        void replicache.close();
        setContext(null);
      };
    }
  }, [user?.id, ReplicacheLicenseKey.value, IsDev.value, mutators, resetAuth]);

  const { loadingIndicator } = useSlot();

  if (!context) return loadingIndicator;

  return (
    <ReplicacheContext.Provider value={context}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}
