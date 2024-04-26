import { createContext, useContext, useState } from "react";

import type { PropsWithChildren } from "react";

// TODO: Remove this if it continues to be unused

export type Slot = undefined;

export type SlotContext = Slot;

export const SlotContext = createContext<SlotContext | null>(null);

interface SlotProviderProps extends PropsWithChildren {
  slot: Slot;
}

export function SlotProvider(props: SlotProviderProps) {
  const [slot] = useState(() => props.slot);

  return (
    <SlotContext.Provider value={slot}>{props.children}</SlotContext.Provider>
  );
}

export function useSlot() {
  const context = useContext(SlotContext);

  if (!context) {
    throw new Error("useSlot must be used within a SlotProvider");
  }

  return context;
}
