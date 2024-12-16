import { useCallback, useEffect, useState } from "react";
import { Replicache } from "replicache";
import { serialize } from "superjson";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useActor } from "~/app/lib/hooks/actor";
import { useApi } from "~/app/lib/hooks/api";
import { useResource } from "~/app/lib/hooks/resource";
import { useSlot } from "~/app/lib/hooks/slot";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { PropsWithChildren } from "react";
import type { AppRouter } from "~/app/types";

interface ReplicacheProviderProps extends PropsWithChildren {
  router: AppRouter;
}

export function ReplicacheProvider(props: ReplicacheProviderProps) {
  const actor = useActor();

  const [replicache, setReplicache] = useState<ReplicacheContext | null>(() =>
    actor.type === "user" ? { status: "initializing" } : null,
  );

  const { replicacheLicenseKey, isDev } = useResource();

  const api = useApi();

  const { invalidate, navigate } = props.router;

  const getAuth = useCallback(async () => {
    await invalidate().finally(
      () => void navigate({ to: "/login", search: initialLoginSearchParams }),
    );

    return null;
  }, [invalidate, navigate]);

  useEffect(() => {
    if (actor.type !== "user") return;

    const client = new Replicache({
      name: actor.properties.id,
      licenseKey: replicacheLicenseKey,
      logLevel: isDev ? "info" : "error",
      pullURL: "/api/replicache/pull",
      pusher: async (req) => {
        const res = await api.replicache.push.$post({
          json: {
            ...req,
            mutations: req.mutations.map((mutation) => ({
              ...mutation,
              args: serialize(mutation.args),
            })),
          },
        });
        if (!res.ok)
          return {
            httpRequestInfo: {
              httpStatusCode: res.status,
              errorMessage: await res.text(),
            },
          };

        const json = await res.json();

        return {
          response: json ?? undefined,
          httpRequestInfo: {
            httpStatusCode: res.status,
            errorMessage: json?.error ?? "",
          },
        };
      },
    });

    client.getAuth = getAuth;

    setReplicache(() => ({ status: "ready", client }));

    return () => {
      setReplicache(() => ({ status: "initializing" }));

      void client.close();
    };
  }, [actor, getAuth, replicacheLicenseKey, isDev, api]);

  const { loadingIndicator } = useSlot();

  if (replicache?.status === "initializing") return loadingIndicator;

  return (
    <ReplicacheContext.Provider value={replicache}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}
