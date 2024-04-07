import { createContext, useContext, useState } from "react";
import { Navigate, redirect } from "@tanstack/react-router";

import type { ReactNode } from "react";
import type { Session, User } from "lucia";

export type Auth = {
  user: User | null;
  session: Session | null;
};

export type AuthContext = {
  data: Auth;
  isAuthenticated: boolean;
  reset: () => void;
  protectRoute: (from: string) => void;
};

export const AuthContext = createContext<AuthContext | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  initialData: Auth;
};

export function AuthProvider(props: AuthProviderProps) {
  const { children, initialData } = props;

  const [data, setData] = useState<Auth>(initialData);

  const isAuthenticated = !!data.user;

  function reset() {
    setData({
      user: null,
      session: null,
    });
  }

  function protectRoute(from: string) {
    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: from },
      });
    }
  }

  return (
    <AuthContext.Provider
      value={{ data, isAuthenticated, reset, protectRoute }}
    >
      {children}
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
    return <Navigate to="/login" search={{ redirect: path }} />;
  }

  return <>{children}</>;
}
