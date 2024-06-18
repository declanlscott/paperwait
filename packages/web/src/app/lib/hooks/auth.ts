import { useCallback, useContext } from "react";
import { MissingContextProviderError } from "@paperwait/core/errors";
import { useRouter } from "@tanstack/react-router";
import { useSubscribe } from "replicache-react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { AuthContext, AuthedContext } from "~/app/lib/contexts";
import { useReplicache } from "~/app/lib/hooks/replicache";
import { initialLoginSearchParams } from "~/app/lib/schemas";

import type { Organization } from "@paperwait/core/organization";
import type { AuthStore } from "~/app/lib/contexts";
import type { Authed, UnAuthed } from "~/app/types";

export function useAuthStore<TSlice>(selector: (store: AuthStore) => TSlice) {
  const store = useContext(AuthContext);

  if (!store) throw new MissingContextProviderError("AuthStore");

  return useStore(store, selector);
}

export const useAuth = () =>
  useAuthStore(
    useShallow(({ user, session, org }) => {
      if (!user || !session || !org)
        return {
          isAuthed: false,
          user: null,
          session: null,
          org: null,
        } satisfies UnAuthed;

      return { isAuthed: true, user, session, org } satisfies Authed;
    }),
  );

export const useAuthActions = () =>
  useAuthStore(useShallow(({ actions }) => actions));

export function useAuthed() {
  const auth = useContext(AuthedContext);

  if (!auth) throw new MissingContextProviderError("Authed");

  return auth;
}

export function useLogout() {
  const { logout } = useAuthActions();

  const { invalidate, navigate } = useRouter();

  const replicache = useReplicache();

  const org = useSubscribe(replicache, (tx) =>
    tx
      .scan<Organization>({ prefix: "organization/" })
      .toArray()
      .then((values) => values.at(0)),
  );

  return useCallback(async () => {
    await logout();

    await invalidate().finally(
      () =>
        void navigate({
          to: "/login",
          search: org?.slug
            ? { ...initialLoginSearchParams, org: org.slug }
            : initialLoginSearchParams,
        }),
    );
  }, [logout, invalidate, navigate, org?.slug]);
}
