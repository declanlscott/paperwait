import { useState } from "react";
import { redirect } from "@tanstack/react-router";
import { produce } from "immer";
import ky from "ky";
import { createStore } from "zustand";

import { AuthContext, AuthedContext } from "~/app/lib/contexts";
import { useAuth } from "~/app/lib/hooks/auth";
import { useSlot } from "~/app/lib/hooks/slot";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { PropsWithChildren } from "react";
import type { AuthStore } from "~/app/lib/contexts";
import type { Auth } from "~/app/types";

interface AuthStoreProviderProps extends PropsWithChildren {
  initialAuth: Auth;
}

export function AuthStoreProvider(props: AuthStoreProviderProps) {
  const [store] = useState(() =>
    createStore<AuthStore>((set, get) => ({
      user: props.initialAuth.user,
      session: props.initialAuth.session,
      org: props.initialAuth.org,
      actions: {
        reset: () => set(() => ({ user: null, session: null })),
        logout: async () =>
          await ky.post("/api/auth/logout").then((res) => {
            if (res.ok) get().actions.reset();
          }),
        protectRoute: (from) => {
          if (!get().user)
            throw redirect({
              to: "/login",
              search: { redirect: from, ...initialLoginSearchParams },
            });
        },
        updateRole: (newRole) =>
          set(
            produce((store: AuthStore) => {
              if (store.user) store.user.role = newRole;
            }),
          ),
      },
    })),
  );

  return (
    <AuthContext.Provider value={store}>{props.children}</AuthContext.Provider>
  );
}

export function AuthedProvider(props: PropsWithChildren) {
  const auth = useAuth();

  const { loadingIndicator } = useSlot();

  // Render the login page if the user is not Authed
  if (!auth.isAuthed) {
    if (location.href.includes("/login")) return props.children;

    // Show loading indicator while the router invalidates
    return loadingIndicator;
  }

  // Otherwise render children in the Authed context
  return (
    <AuthedContext.Provider value={auth}>
      {props.children}
    </AuthedContext.Provider>
  );
}
