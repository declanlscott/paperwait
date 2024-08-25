import { createContext } from "../utils/context";

import type { Authenticated, Unauthenticated } from ".";

export type AuthContext = Authenticated | Unauthenticated;
export const AuthContext = createContext<AuthContext>();

export function useAuth(): AuthContext {
  try {
    return AuthContext.use();
  } catch {
    return { isAuthed: false, session: null, user: null, org: null };
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

  if (!auth.isAuthed) throw new Error("User is not authenticated.");

  return auth;
}

export const useAuthenticated = assertAuth;
