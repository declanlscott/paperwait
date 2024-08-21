import { createContext } from "../context";

import type { LuciaUser } from "../auth/lucia";

export type UserActor = {
  role: "user";
  properties: LuciaUser;
};

export type PublicActor = {
  role: "public";
};

type Actor = UserActor | PublicActor;

type ActorContext = Actor;
export const ActorContext = createContext<ActorContext>();

export function useActor(): ActorContext {
  try {
    return ActorContext.use();
  } catch {
    return { role: "public" };
  }
}

export function assertActor<TActorRole extends Actor["role"]>(
  role: TActorRole,
) {
  const actor = useActor();

  if (actor.role !== role)
    throw new Error(`Actor is "${actor.role}" not "${role}".`);

  return actor as Extract<Actor, { role: TActorRole }>;
}

export const useUser = () => assertActor("user").properties;

export const withActor = <
  TActor extends Actor,
  TCallback extends () => ReturnType<TCallback>,
>(
  actor: TActor,
  callback: TCallback,
) => ActorContext.with(actor, callback);
