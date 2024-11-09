import { ApplicationError } from "@printworks/core/utils/errors";

import { Utils } from "../utils";

import type { Authenticated, Unauthenticated } from "./shared";

export type Auth = Authenticated | Unauthenticated;
export type AuthContext = Auth;
export const AuthContext = Utils.createContext<AuthContext>("Auth");

export function useAuth(): AuthContext {
  try {
    return AuthContext.use();
  } catch {
    return { isAuthed: false, session: null, user: null, tenant: null };
  }
}

export const withAuth = <
  TAuthContext extends AuthContext,
  TCallback extends () => ReturnType<TCallback>,
>(
  context: TAuthContext,
  callback: TCallback,
) => AuthContext.with(context, callback);

export function assertAuth() {
  const auth = useAuth();

  if (!auth.isAuthed) throw new ApplicationError.Unauthenticated();

  return auth;
}

export const useAuthenticated = assertAuth;
