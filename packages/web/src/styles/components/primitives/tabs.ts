import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const tabsStyles = tv({
  slots: {
    root: "group flex flex-col gap-2",
    list: "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
    tab: "inline-flex cursor-default justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium outline-none ring-offset-background transition-all group-data-[orientation=vertical]:w-full",
    panel: "ring-offset-background mt-2",
  },
  variants: {
    orientation: {
      horizontal: {
        root: "flex-col",
        list: "flex-row",
      },
      vertical: {
        root: "flex-row",
        list: "h-auto flex-col",
      },
    },
    isFocusVisible: {
      true: {
        tab: "ring-2 ring-ring ring-offset-2",
        panel: "ring-ring outline-none ring-2 ring-offset-2",
      },
    },
    isDisabled: {
      true: {
        tab: "pointer-events-none opacity-50",
      },
    },
    isSelected: {
      true: {
        tab: "bg-background text-foreground shadow-sm",
      },
    },
  },
});
export type TabsStyles = VariantProps<typeof tabsStyles>;
