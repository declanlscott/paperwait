import { createContext } from "react";

import type { ClientResourceType } from "@paperwait/core/types";
import type { UserRole } from "@paperwait/core/user";
import type { Replicache } from "replicache";
import type { StoreApi } from "zustand";
import type { Auth, Authed, CommandBarPage, Slot } from "~/app/types";

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

export const AuthedContext = createContext<Authed | null>(null);

export type ReplicacheContext = Replicache;

export const ReplicacheContext = createContext<ReplicacheContext | null>(null);

export type ResourceContext = ClientResourceType;

export const ResourceContext = createContext<ClientResourceType | null>(null);

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
