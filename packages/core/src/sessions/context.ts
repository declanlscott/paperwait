import { Unauthenticated as UnauthenticatedError } from "../errors/application";
import { Utils } from "../utils";

import type { Authenticated, Unauthenticated } from "./shared";

export type Auth = Authenticated | Unauthenticated;
export type AuthContext = Auth;
export const AuthContext = Utils.createContext<AuthContext>("Session");

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

  if (!auth.isAuthed) throw new UnauthenticatedError();

  return auth;
}

export const useAuthenticated = assertAuth;