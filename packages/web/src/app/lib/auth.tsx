import { createContext, useContext, useState } from "react";
import { flushSync } from "react-dom";
import { Navigate, redirect } from "@tanstack/react-router";
import { produce } from "immer";
import ky from "ky";
import { merge, minLength, object, optional, string } from "valibot";
import { createStore, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { PropsWithChildren } from "react";
import type { LuciaSession, LuciaUser } from "@paperwait/core/auth";
import type { UserRole } from "@paperwait/core/user";
import type { Output } from "valibot";
import type { StoreApi } from "zustand";

export type Auth = {
  user: LuciaUser | null;
  session: LuciaSession | null;
};

type AuthActions = {
  reset: () => void;
  logout: () => Promise<void>;
  protectRoute: (from: string) => void;
  updateRole: (newRole: UserRole) => void;
};

export interface AuthStore extends Auth {
  actions: AuthActions;
}

export const AuthContext = createContext<StoreApi<AuthStore> | null>(null);

export const baseSearchParams = object({
  redirect: optional(string()),
});

export const loginSearchParams = merge([
  baseSearchParams,
  object({ org: string([minLength(1)]) }),
]);

export const initialLoginSearchParams = { org: "" } satisfies Output<
  typeof loginSearchParams
>;

interface AuthProviderProps extends PropsWithChildren {
  initialData: Auth;
}

export function AuthProvider(props: AuthProviderProps) {
  const [store] = useState(() =>
    createStore<AuthStore>((set, get) => ({
      user: props.initialData.user,
      session: props.initialData.session,
      actions: {
        reset: () => set(() => ({ user: null, session: null })),
        logout: async () => {
          const result = await ky.post("/api/auth/logout");

          if (result.status === 204) {
            // Flush sync to ensure the reset finishes before the router runs
            flushSync(get().actions.reset);
          }
        },
        protectRoute: (from) => {
          if (!get().user)
            throw redirect({
              to: "/login",
              search: { redirect: from, ...initialLoginSearchParams },
            });
        },
        updateRole: (newRole) =>
          set(
            produce((state: Auth) => {
              if (state.user) {
                state.user.role = newRole;
              }
            }),
          ),
      },
    })),
  );

  return (
    <AuthContext.Provider value={store}>{props.children}</AuthContext.Provider>
  );
}

export function useAuthStore<TSlice>(selector: (store: AuthStore) => TSlice) {
  const store = useContext(AuthContext);

  if (!store) {
    throw new Error("useAuthStore must be used within an AuthProvider");
  }

  return useStore(store, selector);
}

export type Authenticated = {
  isAuthenticated: true;
  user: LuciaUser;
  session: LuciaSession;
};

export type Unauthenticated = {
  isAuthenticated: false;
  user: null;
  session: null;
};

export const useAuthContext = () =>
  useAuthStore(
    useShallow(({ user, session }) => {
      if (!user || !session) {
        return {
          isAuthenticated: false,
          user: null,
          session: null,
        } satisfies Unauthenticated;
      }

      return { isAuthenticated: true, user, session } satisfies Authenticated;
    }),
  );

export const useAuthActions = () =>
  useAuthStore(useShallow(({ actions }) => actions));

export const AuthenticatedContext = createContext<Authenticated | null>(null);

export function AuthenticatedProvider(props: PropsWithChildren) {
  const auth = useAuthContext();

  // Render the login page if the user is not authenticated
  if (!auth.isAuthenticated) {
    // Don't redirect if we're already on the login page
    if (location.href.includes("/login")) {
      return props.children;
    }

    // Otherwise redirect there
    return <Navigate to="/login" search={initialLoginSearchParams} />;
  }

  // Otherwise render children in the authenticated context
  return (
    <AuthenticatedContext.Provider value={auth}>
      {props.children}
    </AuthenticatedContext.Provider>
  );
}

export function useAuthenticatedContext() {
  const auth = useContext(AuthenticatedContext);

  if (!auth) {
    throw new Error(
      "useAuthenticatedContext must be used within an AuthenticatedProvider",
    );
  }

  return auth;
}
