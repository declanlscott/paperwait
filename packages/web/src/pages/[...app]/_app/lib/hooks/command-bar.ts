import { useContext } from "react";
import { MissingContextProvider } from "@paperwait/core/errors/application";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { CommandBarContext } from "~/app/lib/contexts";

import type { CommandBarStore } from "~/app/lib/contexts";

export function useCommandBarStore<TSlice>(
  selector: (store: CommandBarStore) => TSlice,
) {
  const store = useContext(CommandBarContext);

  if (!store) throw new MissingContextProvider("CommandBarStore");

  return useStore(store, selector);
}

export const useCommandBar = () =>
  useCommandBarStore(useShallow(({ input, pages }) => ({ input, pages })));

export const useCommandBarActions = () =>
  useCommandBarStore(useShallow(({ actions }) => actions));
