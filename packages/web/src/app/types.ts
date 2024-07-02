import type { ComponentProps, ReactNode } from "react";
import type { Link as AriaLink } from "react-aria-components";
import type { Room } from "@paperwait/core/room";
import type { RankingInfo } from "@tanstack/match-sorter-utils";
import type { MutationOptions } from "@tanstack/react-query";
import type {
  createRouter,
  NavigateOptions,
  RegisteredRouter,
  RoutePaths,
  ToOptions,
  ToPathOption,
} from "@tanstack/react-router";
import type { FilterFn } from "@tanstack/react-table";
import type { Replicache } from "replicache";
import type { Mutators } from "~/app/lib/hooks/replicache";
import type { routeTree } from "~/app/routeTree.gen";

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

declare module "react-aria-components" {
  interface RouterConfig {
    href: Href;
    routerOptions: Omit<NavigateOptions, keyof ToOptions>;
  }
}

declare module "@tanstack/react-table" {
  //add fuzzy filter to the filterFns
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
  interface FilterMeta {
    itemRank: RankingInfo;
  }
}

export type AppRouter = ReturnType<
  typeof createRouter<typeof routeTree, "always" | "never" | "preserve">
>;

export type Auth = Pick<App.Locals, "user" | "session" | "org">;

export type Authenticated = {
  [TKey in keyof Auth]: NonNullable<Auth[TKey]>;
} & { isAuthed: true; replicache: Replicache<Mutators> };

export type Unauthenticated = {
  [TKey in keyof Auth]: null;
} & { isAuthed: false; replicache: null };

export type Slot = {
  loadingIndicator: ReactNode;
  logo: ReactNode;
};

export type CommandBarPage =
  | { type: "home" }
  | { type: "room"; roomId: Room["id"] };

export type MutationOptionsFactory = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  () => MutationOptions<any, any, any, any>
>;

export type AppLink = {
  name: string;
  props: ComponentProps<typeof AriaLink>;
  icon?: ReactNode;
};

export type Href = ToPathOption<
  RegisteredRouter,
  RoutePaths<RegisteredRouter["routeTree"]>,
  ""
>;
