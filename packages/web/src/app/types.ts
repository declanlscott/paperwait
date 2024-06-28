import type { ComponentProps, ReactNode } from "react";
import type { Link as AriaLink } from "react-aria-components";
import type { Room } from "@paperwait/core/room";
import type { MutationOptions } from "@tanstack/react-query";
import type {
  RegisteredRouter,
  RoutePaths,
  ToPathOption,
} from "@tanstack/react-router";
import type { ReadTransaction } from "replicache";

export type Auth = Pick<App.Locals, "user" | "session" | "org">;

export type Authenticated = {
  [TKey in keyof Auth]: NonNullable<Auth[TKey]>;
} & { isAuthed: true };

export type Unauthenticated = {
  [TKey in keyof Auth]: null;
} & { isAuthed: false };

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

export type Links = Array<{
  name: string;
  props: ComponentProps<typeof AriaLink>;
  icon?: ReactNode;
}>;

export type Href = ToPathOption<
  RegisteredRouter,
  RoutePaths<RegisteredRouter["routeTree"]>,
  ""
>;
