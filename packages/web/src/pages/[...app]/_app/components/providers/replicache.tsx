import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@printworks/core/sessions/context";
import { Replicache } from "replicache";
import { serialize } from "superjson";

import { ReplicacheContext } from "~/app/lib/contexts";
import { useApi } from "~/app/lib/hooks/api";
import { useAuthActions } from "~/app/lib/hooks/auth";
import { useResource } from "~/app/lib/hooks/resource";
import { useSlot } from "~/app/lib/hooks/slot";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { PropsWithChildren } from "react";
import type { PusherResult, PushResponse } from "replicache";
import type { AppRouter } from "~/app/types";

interface ReplicacheProviderProps extends PropsWithChildren {
  router: AppRouter;
}

export function ReplicacheProvider(props: ReplicacheProviderProps) {
  const api = useApi();

  const { invalidate, navigate } = props.router;

  const { user } = useAuth();
  const [replicache, setReplicache] = useState<ReplicacheContext | null>(() =>
    user ? { status: "initializing" } : null,
  );

  const { replicacheLicenseKey, isDev } = useResource();
  const { reset } = useAuthActions();

  const getAuth = useCallback(
    async (replicache: Replicache) => {
      reset();

      await invalidate().finally(
        () =>
          void navigate({
            to: "/login",
            search: initialLoginSearchParams,
          }),
      );

      return null;
    },
    [reset, invalidate, navigate],
  );

  useEffect(() => {
    if (!user) return;

    const client = new Replicache({
      name: user.id,
      licenseKey: replicacheLicenseKey,
      pushURL: "/api/replicache/push",
      pullURL: "/api/replicache/pull",
      logLevel: isDev ? "info" : "error",
      pusher: async (req) => {
        const res = await api.replicache.push.$post({
          json: {
            ...req,
            mutations: req.mutations.map((mutation) => ({
              ...mutation,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
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

    client.getAuth = () => getAuth(client);

    setReplicache(() => ({ status: "ready", client }));

    return () => {
      setReplicache(() => (user ? { status: "initializing" } : null));
      void client.close();
    };
  }, [user, replicacheLicenseKey, isDev, api, getAuth]);

  const { loadingIndicator } = useSlot();

  if (replicache?.status === "initializing") return loadingIndicator;

  return (
    <ReplicacheContext.Provider value={replicache}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}
