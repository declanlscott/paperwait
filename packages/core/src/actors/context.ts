import { Utils } from "../utils";

import type { Actor } from "./shared";

export type ActorContext = Actor;
export const ActorContext = Utils.createContext<ActorContext>("Actor");

export const useActor = ActorContext.use;
export const withActor = ActorContext.with;

export function assertActor<TActorType extends Actor["type"]>(
  type: TActorType,
) {
  const actor = useActor();

  if (actor.type !== type)
    throw new Error(`Expected actor type "${type}", got "${actor.type}"`);

  return actor as Extract<Actor, { type: TActorType }>;
}

export function assertNonPublicActor() {
  const actor = useActor();

  if (actor.type === "public") throw new Error("Expected non-public actor");

  return actor;
}
