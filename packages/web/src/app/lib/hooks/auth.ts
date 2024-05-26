import { useCallback, useContext } from "react";
import { useRouter } from "@tanstack/react-router";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { AuthContext, AuthedContext } from "~/app/lib/contexts";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { AuthStore } from "~/app/lib/contexts";
import type { Authed, UnAuthed } from "~/app/types";

export function useAuthStore<TSlice>(selector: (store: AuthStore) => TSlice) {
  const store = useContext(AuthContext);

  if (!store)
    throw new Error("useAuthStore must be used within an AuthProvider");

  return useStore(store, selector);
}

export const useAuthContext = () =>
  useAuthStore(
    useShallow(({ user, session, org }) => {
      if (!user || !session || !org)
        return {
          isAuthed: false,
          user: null,
          session: null,
          org: null,
        } satisfies UnAuthed;

      return { isAuthed: true, user, session, org } satisfies Authed;
    }),
  );

export const useAuthActions = () =>
  useAuthStore(useShallow(({ actions }) => actions));

export function useAuthedContext() {
  const auth = useContext(AuthedContext);

  if (!auth)
    throw new Error("useAuthedContext must be used within an AuthedProvider");

  return auth;
}

export function useLogout() {
  const { logout } = useAuthActions();
  const { invalidate, navigate } = useRouter();
  const { org } = useAuthedContext();

  return useCallback(async () => {
    await logout();
    await invalidate().finally(
      () =>
        void navigate({
          to: "/login",
          search: { ...initialLoginSearchParams, org: org.slug },
        }),
    );
  }, [logout, invalidate, navigate, org.slug]);
}
