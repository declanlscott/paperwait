import { createContext } from "react";

import type { ClientResource } from "@paperwait/core/types";
import type { UserRole } from "@paperwait/core/user";
import type { Replicache } from "replicache";
import type { StoreApi } from "zustand";
import type { Mutators } from "~/app/lib/hooks/replicache";
import type { Auth, Authenticated, CommandBarPage, Slot } from "~/app/types";

type AuthActions = {
  initializeReplicache: (client: Replicache<Mutators>) => void;
  reset: () => void;
  logout: () => Promise<void>;
  authenticateRoute: (from: string) => Omit<Authenticated, "isAuthed">;
  authorizeRoute: (user: Authenticated["user"], roles: Array<UserRole>) => void;
};

export interface AuthStore extends Auth {
  replicache:
    | { status: "initializing" }
    | { status: "ready"; client: Replicache<Mutators> }
    | null;
  actions: AuthActions;
}

export const AuthContext = createContext<StoreApi<AuthStore> | null>(null);

export const AuthenticatedContext = createContext<Authenticated | null>(null);

export type ResourceContext = ClientResource;

export const ResourceContext = createContext<ClientResource | null>(null);

export type SlotContext = Slot;

export const SlotContext = createContext<SlotContext | null>(null);

export type CommandBarStore = {
  input: string;
  pages: Array<CommandBarPage>;
  actions: {
    setInput: (input: string) => void;
    pushPage: (page: CommandBarPage) => void;
    popPage: () => void;
    getActivePage: () => CommandBarPage;
    reset: () => void;
  };
};

export const CommandBarContext =
  createContext<StoreApi<CommandBarStore> | null>(null);
