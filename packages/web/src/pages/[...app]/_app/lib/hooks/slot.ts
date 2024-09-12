import { useContext } from "react";
import { MissingContextProvider } from "@paperwait/core/errors/application";

import { SlotContext } from "~/app/lib/contexts";

export function useSlot() {
  const context = useContext(SlotContext);

  if (!context) throw new MissingContextProvider("Slot");

  return context;
}
