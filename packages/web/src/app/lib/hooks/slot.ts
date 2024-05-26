import { useContext } from "react";

import { SlotContext } from "~/app/lib/contexts";

export function useSlot() {
  const context = useContext(SlotContext);

  if (!context) throw new Error("useSlot must be used within a SlotProvider");

  return context;
}
