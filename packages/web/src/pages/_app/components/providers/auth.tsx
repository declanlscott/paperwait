import { useState } from "react";
import { enforceRbac } from "@paperwait/core/auth/rbac";
import { InvalidUserRoleError } from "@paperwait/core/errors/application";
import { HttpError } from "@paperwait/core/errors/http";
import { redirect } from "@tanstack/react-router";
import { createStore } from "zustand";

import { AuthContext, AuthenticatedContext } from "~/app/lib/contexts";
import { useAuth } from "~/app/lib/hooks/auth";
import { useSlot } from "~/app/lib/hooks/slot";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { PropsWithChildren } from "react";
import type { Auth } from "@paperwait/core/auth";
import type { AuthStore } from "~/app/lib/contexts";
import type { AppRouter } from "~/app/types";

interface AuthStoreProviderProps extends PropsWithChildren {
  auth: Auth;
  router: AppRouter;
}

export function AuthStoreProvider(props: AuthStoreProviderProps) {
  const { auth } = props;

  const [store] = useState(() =>
    createStore<AuthStore>((set, get) => ({
      user: auth.user,
      session: auth.session,
      org: auth.org,
      actions: {
        reset: () =>
          set(() => ({
            user: null,
            session: null,
            org: null,
          })),
        logout: async () => {
          const res = await fetch("/api/auth/logout", { method: "POST" });
          if (!res.ok) throw new HttpError(res.statusText, res.status);

          get().actions.reset();
        },
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
          enforceRbac(user, roles, InvalidUserRoleError),
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
