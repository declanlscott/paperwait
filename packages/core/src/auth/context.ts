import { Unauthenticated as UnauthenticatedError } from "../errors/application";
import { createContext } from "../utils";

import type { Authenticated, Unauthenticated } from ".";

export type AuthContext = Authenticated | Unauthenticated;
export const AuthContext = createContext<AuthContext>("Auth");

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
