import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const listBoxStyles = tv({
  slots: {
    root: "bg-popover text-popover-foreground group overflow-auto rounded-md border p-1 shadow-md outline-none",
    item: "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
    header: "py-1.5 pl-8 pr-2 text-sm font-semibold",
  },
  variants: {
    isEmpty: {
      true: {
        root: "p-6 text-center text-sm",
      },
    },
    isDisabled: {
      true: {
        item: "pointer-events-none opacity-50",
      },
    },
    isFocused: {
      true: {
        item: "bg-accent text-accent-foreground",
      },
    },
    isHovered: {
      true: {
        item: "bg-accent text-accent-foreground",
      },
    },
    selectionMode: {
      none: {
        item: "pl-0",
      },
      single: {
        item: "pl-8",
      },
      multiple: {
        item: "pl-8",
      },
    },
  },
});
export type ListBoxStyles = VariantProps<typeof listBoxStyles>;
