import { useCallback, useContext } from "react";
import { MissingContextProviderError } from "@paperwait/core/errors";
import { useRouter } from "@tanstack/react-router";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { AuthContext, AuthenticatedContext } from "~/app/lib/contexts";
import { queryFactory, useQuery } from "~/app/lib/hooks/data";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { AuthStore } from "~/app/lib/contexts";
import type { Authenticated, Unauthenticated } from "~/app/types";

export function useAuthStore<TSlice>(selector: (store: AuthStore) => TSlice) {
  const store = useContext(AuthContext);

  if (!store) throw new MissingContextProviderError("AuthStore");

  return useStore(store, selector);
}

export const useAuth = () =>
  useAuthStore(
    useShallow(({ user, session, org, replicache }) => {
      if (!user || !session || !org || replicache?.status !== "ready")
        return {
          isAuthed: false,
          user: null,
          session: null,
          org: null,
          replicache: null,
        } satisfies Unauthenticated;

      return {
        isAuthed: true,
        user,
        session,
        org,
        replicache: replicache.client,
      } satisfies Authenticated;
    }),
  );

export const useAuthActions = () =>
  useAuthStore(useShallow(({ actions }) => actions));

export function useAuthenticated() {
  const auth = useContext(AuthenticatedContext);

  if (!auth) throw new MissingContextProviderError("Authenticated");

  return auth;
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
