import { createContext } from "react";

import type { Actor } from "@printworks/core/actors/shared";
import type { Auth, Authenticated } from "@printworks/core/auth/shared";
import type { UserRole } from "@printworks/core/users/shared";
import type { Replicache } from "replicache";
import type { Resource } from "sst";
import type { StoreApi } from "zustand";
import type { CommandBarPage, Slot } from "~/app/types";

export type ActorContext = Actor;
export const ActorContext = createContext<ActorContext | null>(null);

export type AuthActions = {
  reset: () => void;
  logout: () => Promise<void>;
  authenticateRoute: (from: string) => Omit<Authenticated, "isAuthed">;
  authorizeRoute: (user: Authenticated["user"], roles: Array<UserRole>) => void;
};

export type AuthStore = Auth & { actions: AuthActions };
export const AuthContext = createContext<StoreApi<AuthStore> | null>(null);

export const AuthenticatedContext = createContext<Authenticated | null>(null);

export type ReplicacheContext =
  | {
      status: "initializing";
    }
  | {
      status: "ready";
      client: Replicache;
    };
export const ReplicacheContext = createContext<ReplicacheContext | null>(null);

export type ResourceContext = Resource["Client"];
export const ResourceContext = createContext<Resource["Client"] | null>(null);

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
