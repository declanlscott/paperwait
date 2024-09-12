import { useCallback, useContext } from "react";
import {
  ApplicationError,
  MissingContextProvider,
} from "@paperwait/core/errors/application";
import { useRouter } from "@tanstack/react-router";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import {
  AuthContext,
  AuthenticatedContext,
  ReplicacheContext,
} from "~/app/lib/contexts";
import { queryFactory, useQuery } from "~/app/lib/hooks/data";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { Authenticated, Unauthenticated } from "@paperwait/core/auth";
import type { AuthStore } from "~/app/lib/contexts";

export function useAuthStore<TSlice>(selector: (store: AuthStore) => TSlice) {
  const store = useContext(AuthContext);

  if (!store) throw new MissingContextProvider("AuthStore");

  return useStore(store, selector);
}

export const useAuth = () =>
  useAuthStore(
    useShallow(({ user, session, org }) => {
      if (!user || !session || !org)
        return {
          isAuthed: false,
          user: null,
          session: null,
          org: null,
        } satisfies Unauthenticated;

      return {
        isAuthed: true,
        user,
        session,
        org,
      } satisfies Authenticated;
    }),
  );

export const useAuthActions = () =>
  useAuthStore(useShallow(({ actions }) => actions));

export function useAuthenticated() {
  const auth = useContext(AuthenticatedContext);
  const replicache = useContext(ReplicacheContext);

  if (!auth) throw new MissingContextProvider("Authenticated");
  if (!replicache) throw new MissingContextProvider("Replicache");
  if (replicache.status !== "ready")
    throw new ApplicationError("Replicache is not in ready state");

  return { ...auth, replicache: replicache.client };
}

export function useLogout() {
  const { logout } = useAuthActions();

  const { invalidate, navigate } = useRouter();

  const org = useQuery(queryFactory.organization());

  return useCallback(async () => {
    await logout();

    await invalidate().finally(
      () =>
        void navigate({
          to: "/login",
          search: org?.slug
            ? { ...initialLoginSearchParams, org: org.slug }
            : initialLoginSearchParams,
        }),
    );
  }, [logout, invalidate, navigate, org?.slug]);
}
