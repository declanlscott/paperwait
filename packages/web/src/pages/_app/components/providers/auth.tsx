import { useCallback, useEffect, useState } from "react";
import { HttpError, InvalidUserRoleError } from "@paperwait/core/errors";
import { enforceRbac } from "@paperwait/core/utils";
import { redirect } from "@tanstack/react-router";
import { Replicache } from "replicache";
import { createStore, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { AuthContext, AuthenticatedContext } from "~/app/lib/contexts";
import { useAuth } from "~/app/lib/hooks/auth";
import { queryFactory } from "~/app/lib/hooks/data";
import { useMutators } from "~/app/lib/hooks/replicache";
import { useResource } from "~/app/lib/hooks/resource";
import { useSlot } from "~/app/lib/hooks/slot";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { PropsWithChildren } from "react";
import type { AuthStore } from "~/app/lib/contexts";
import type { Mutators } from "~/app/lib/hooks/replicache";
import type { AppRouter, Auth } from "~/app/types";

interface AuthStoreProviderProps extends PropsWithChildren {
  auth: Auth;
  router: AppRouter;
}

export function AuthStoreProvider(props: AuthStoreProviderProps) {
  const { auth, router } = props;
  const { invalidate, navigate } = router;

  const [store] = useState(() =>
    createStore<AuthStore>((set, get) => ({
      user: auth.user,
      session: auth.session,
      org: auth.org,
      replicache: auth.user ? { status: "initializing" } : null,
      actions: {
        initializeReplicache: (client) =>
          set(() => ({ replicache: { status: "ready", client } })),
        reset: () =>
          set(() => ({
            user: null,
            session: null,
            org: null,
            replicache: null,
          })),
        logout: async () => {
          const res = await fetch("/api/auth/logout", { method: "POST" });
          if (!res.ok) throw new HttpError(res.statusText, res.status);

          get().actions.reset();
        },
        authenticateRoute: (from) => {
          const { user, session, org, replicache } = get();

          if (!user || !session || !org || replicache?.status !== "ready")
            throw redirect({
              to: "/login",
              search: { redirect: from, ...initialLoginSearchParams },
            });

          return { user, session, org, replicache: replicache.client };
        },
        authorizeRoute: (user, roles) =>
          enforceRbac(user, roles, InvalidUserRoleError),
      },
    })),
  );

  const { user, replicache, reset, initializeReplicache } = useStore(
    store,
    useShallow(({ user, replicache, actions }) => ({
      user,
      replicache,
      reset: actions.reset,
      initializeReplicache: actions.initializeReplicache,
    })),
  );

  const { ReplicacheLicenseKey, IsDev } = useResource();

  const mutators = useMutators(user);

  const { loadingIndicator } = useSlot();

  const getAuth = useCallback(
    async (replicache: Replicache<Mutators>) => {
      reset();

      const org = await replicache.query(queryFactory.organization());

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

      replicache.getAuth = () => getAuth(replicache);

      initializeReplicache(replicache);

      return () => void replicache.close();
    }
  }, [
    user?.id,
    ReplicacheLicenseKey.value,
    IsDev.value,
    mutators,
    getAuth,
    initializeReplicache,
  ]);

  if (replicache?.status === "initializing") return loadingIndicator;

  return (
    <AuthContext.Provider value={store}>{props.children}</AuthContext.Provider>
  );
}

export function AuthenticatedProvider(props: PropsWithChildren) {
  const auth = useAuth();

  const { loadingIndicator } = useSlot();

  // Render the login page if the user is not authenticated
  if (!auth.isAuthed) {
    if (location.href.includes("/login")) return props.children;

    // Show loading indicator while the router invalidates
    return loadingIndicator;
  }

  // Otherwise render children in the authenticated context
  return (
    <AuthenticatedContext.Provider value={auth}>
      {props.children}
    </AuthenticatedContext.Provider>
  );
}
