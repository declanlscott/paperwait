import { useState } from "react";

import { ActorContext } from "~/app/lib/contexts";

import type { PropsWithChildren } from "react";
import type { Actor } from "@printworks/core/actors/shared";

interface ActorProviderProps extends PropsWithChildren {
  actor: Actor;
}

export function ActorProvider(props: ActorProviderProps) {
  const [actor] = useState<ActorContext>(() => props.actor);

  return (
    <ActorContext.Provider value={actor}>
      {props.children}
    </ActorContext.Provider>
  );
}
