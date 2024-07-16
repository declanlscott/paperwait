import { useContext } from "react";
import { MissingContextProviderError } from "@paperwait/core/errors";

import { SlotContext } from "~/app/lib/contexts";

export function useSlot() {
  const context = useContext(SlotContext);

  if (!context) throw new MissingContextProviderError("Slot");

  return context;
}
