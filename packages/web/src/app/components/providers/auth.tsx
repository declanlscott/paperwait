import { useState } from "react";
import { InvalidUserRoleError } from "@paperwait/core/errors";
import { assertRole } from "@paperwait/core/user";
import { redirect } from "@tanstack/react-router";
import { produce } from "immer";
import ky from "ky";
import { createStore } from "zustand";

import { AuthContext, AuthenticatedContext } from "~/app/lib/contexts";
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
        authenticateRoute: (from) => {
          const { user, session, org } = get();

          if (!user || !session || !org)
            throw redirect({
              to: "/login",
              search: { redirect: from, ...initialLoginSearchParams },
            });

          return { user, session, org };
        },
        authorizeRoute: (user, roles) =>
          assertRole(user, roles, InvalidUserRoleError),
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
