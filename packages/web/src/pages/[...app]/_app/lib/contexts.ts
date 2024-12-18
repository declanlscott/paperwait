import { createContext } from "react";

import type { Actor } from "@printworks/core/actors/shared";
import type { UserRole } from "@printworks/core/users/shared";
import type { User, UserWithProfile } from "@printworks/core/users/sql";
import type { ReadTransaction, Replicache } from "replicache";
import type { Resource } from "sst";
import type { StoreApi } from "zustand";
import type { routePermissions } from "~/app/lib/access-control";
import type { Mutators } from "~/app/lib/hooks/replicache";
import type {
  AuthenticatedEagerRouteId,
  CommandBarPage,
  Slot,
} from "~/app/types";

export type ActorContext = Actor;
export const ActorContext = createContext<ActorContext | null>(null);

export type AuthActions = {
  authenticateRoute: (from: string) => Extract<Actor, { type: "user" }>;
  authorizeRoute: <
    TRouteId extends AuthenticatedEagerRouteId,
    TPermission extends (typeof routePermissions)[UserRole][TRouteId],
  >(
    tx: ReadTransaction,
    userId: User["id"],
    routeId: TRouteId,
    ...input: TPermission extends (
      tx: ReadTransaction,
      user: UserWithProfile,
      ...input: infer TInput
    ) => unknown
      ? TInput
      : Array<never>
  ) => Promise<void>;
};

export type ReplicacheContext =
  | { status: "initializing" }
  | { status: "ready"; client: Replicache<Mutators> };
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
