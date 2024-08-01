import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const listBoxStyles = tv({
  base: "bg-popover text-popover-foreground group overflow-auto rounded-md border p-1 shadow-md outline-none",
  variants: {
    isEmpty: {
      true: "p-6 text-center text-sm",
    },
  },
});
export type ListBoxStyles = VariantProps<typeof listBoxStyles>;

export const listBoxItemStyles = tv({
  base: "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
  variants: {
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
    isFocused: {
      true: "bg-accent text-accent-foreground",
    },
    isHovered: {
      true: "bg-accent text-accent-foreground",
    },
    selectionMode: {
      none: "pl-0",
      single: "pl-8",
      multiple: "pl-8",
    },
  },
});
export type ListBoxItemStyles = VariantProps<typeof listBoxItemStyles>;

export const listBoxHeaderStyles = tv({
  base: "py-1.5 pl-8 pr-2 text-sm font-semibold",
});
export type ListBoxHeaderStyles = VariantProps<typeof listBoxHeaderStyles>;
