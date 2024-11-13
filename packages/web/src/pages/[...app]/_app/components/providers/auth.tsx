import { useState } from "react";
import { ApplicationError, HttpError } from "@printworks/core/utils/errors";
import { enforceRbac } from "@printworks/core/utils/shared";
import { redirect } from "@tanstack/react-router";
import { createStore } from "zustand";

import { AuthContext, AuthenticatedContext } from "~/app/lib/contexts";
import { useAuth } from "~/app/lib/hooks/auth";
import { useSlot } from "~/app/lib/hooks/slot";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { PropsWithChildren } from "react";
import type { Auth } from "@printworks/core/sessions/shared";
import type { AuthStore } from "~/app/lib/contexts";
import type { AppRouter } from "~/app/types";

interface AuthStoreProviderProps extends PropsWithChildren {
  auth: Auth;
  router: AppRouter;
}

export function AuthStoreProvider(props: AuthStoreProviderProps) {
  const [store] = useState(() =>
    createStore<AuthStore>((set, get) => ({
      ...props.auth,
      actions: {
        reset: () =>
          set(() => ({
            isAuthed: false,
            user: null,
            session: null,
            tenant: null,
          })),
        logout: async () => {
          const res = await fetch("/api/auth/logout", { method: "POST" });
          if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

          get().actions.reset();
        },
        authenticateRoute: (from) => {
          const store = get();

          if (!store.isAuthed) {
            throw redirect({
              to: "/login",
              search: { redirect: from, ...initialLoginSearchParams },
            });
          }

          return {
            user: store.user,
            session: store.session,
            tenant: store.tenant,
          };
        },
        authorizeRoute: (user, roles) =>
          enforceRbac(user, roles, {
            Error: ApplicationError.AccessDenied,
            args: [],
          }),
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
