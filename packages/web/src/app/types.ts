import type { ReactNode } from "react";
import type { Room } from "@paperwait/core/room";

export type Auth = Pick<App.Locals, "user" | "session" | "org">;

export type Authed = {
  [TKey in keyof Auth]: NonNullable<Auth[TKey]>;
} & { isAuthed: true };

export type UnAuthed = {
  [TKey in keyof Auth]: null;
} & { isAuthed: false };

export type Slot = {
  loadingIndicator: ReactNode;
  logo: ReactNode;
};

export type CommandBarPage =
  | { type: "home" }
  | { type: "room"; roomId: Room["id"] };
