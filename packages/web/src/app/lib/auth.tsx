import { createContext, useContext, useState } from "react";
import { Navigate, redirect } from "@tanstack/react-router";
import { produce } from "immer";
import ky from "ky";
import { merge, minLength, object, optional, string } from "valibot";
import { createStore, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { ReactNode } from "react";
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

type AuthProviderProps = {
  children: ReactNode;
  initialData: Auth;
};

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
            get().actions.reset();
          }
        },
        protectRoute: (from) => {
          if (!get().user) {
            throw redirect({
              to: "/login",
              search: { redirect: from, ...initialLoginSearchParams },
            });
          }
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

export const useAuth = () =>
  useAuthStore(
    useShallow(({ user, session }) => ({
      user,
      session,
      isAuthenticated: !!user,
    })),
  );

export const useAuthActions = () => useAuthStore(({ actions }) => actions);

type ProtectRouteProps = {
  children: ReactNode;
  path: string;
};

export function ProtectRoute(props: ProtectRouteProps) {
  const { children, path } = props;

  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        search={{ redirect: path, ...initialLoginSearchParams }}
      />
    );
  }

  return children;
}
