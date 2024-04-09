import { createContext, useContext } from "react";

import type { ReactNode } from "react";

export type Slot = {
  placeholderImg: ReactNode;
};

export type SlotContext = Slot;

export const SlotContext = createContext<SlotContext | null>(null);

type SlotProviderProps = {
  children: ReactNode;
  slot: Slot;
};

export function SlotProvider(props: SlotProviderProps) {
  const { children, slot } = props;

  return <SlotContext.Provider value={slot}>{children}</SlotContext.Provider>;
}

export function useSlot() {
  const context = useContext(SlotContext);

  if (!context) {
    throw new Error("useSlot must be used within a SlotProvider");
  }

  return context;
}
