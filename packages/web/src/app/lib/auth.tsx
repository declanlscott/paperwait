import { createContext, useContext, useState } from "react";
import { flushSync } from "react-dom";
import { Navigate, redirect } from "@tanstack/react-router";
import { z } from "astro/zod";
import ky from "ky";

import type { ReactNode } from "react";
import type { LuciaRegister } from "@paperwait/core/auth";
import type { Session, User } from "lucia";

declare module "lucia" {
  interface Register extends LuciaRegister {}
}

export type Auth = {
  user: User | null;
  session: Session | null;
};

export type AuthContext = {
  data: Auth;
  isAuthenticated: boolean;
  reset: () => void;
  logout: () => Promise<void>;
  protectRoute: (from: string) => void;
};

export const AuthContext = createContext<AuthContext | null>(null);

export const baseSearchParams = z.object({
  redirect: z.string().optional(),
});

export const loginSearchParams = baseSearchParams.extend({
  org: z.string().min(1),
});

export const initialLoginSearchParams = { org: "" } satisfies z.infer<
  typeof loginSearchParams
>;

type AuthProviderProps = {
  children: ReactNode;
  initialData: Auth;
};

export function AuthProvider(props: AuthProviderProps) {
  const [data, setData] = useState<Auth>(() => props.initialData);

  const isAuthenticated = !!data.user;

  function reset() {
    setData(() => ({
      user: null,
      session: null,
    }));
  }

  async function logout() {
    const result = await ky.post("/api/auth/logout");

    if (result.status === 204) {
      // Ensure the auth context is reset before the router runs
      flushSync(reset);
    }
  }

  function protectRoute(from: string) {
    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: from, ...initialLoginSearchParams },
      });
    }
  }

  return (
    <AuthContext.Provider
      value={{ data, isAuthenticated, reset, logout, protectRoute }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

type ProtectedRouteProps = {
  children: ReactNode;
  path: string;
};

export function ProtectedRoute(props: ProtectedRouteProps) {
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
