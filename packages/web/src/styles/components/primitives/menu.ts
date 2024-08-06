import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const menuStyles = tv({
  slots: {
    root: "max-h-[inherit] overflow-auto rounded-md border p-1 outline outline-0 [clip-path:inset(0_0_0_0_round_calc(var(--radius)-2px))]",
    popover: "bg-popover text-popover-foreground z-50 rounded-md shadow-md",
    item: "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
    header: "px-2 py-1.5 text-sm font-semibold",
    separator: "bg-muted -mx-1 my-1 h-px",
    keyboard: "ml-auto text-xs tracking-widest opacity-60",
    checkboxItem:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
    radioItem:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
  },
  variants: {
    isEntering: {
      true: {
        popover: "animate-in fade-in-0",
      },
    },
    isExiting: {
      true: {
        popover: "animate-out fade-out-0 zoom-out-95",
      },
    },
    placement: {
      bottom: {
        popover: "slide-in-from-top-2",
      },
      left: {
        popover: "slide-in-from-right-2",
      },
      right: {
        popover: "slide-in-from-left-2",
      },
      top: {
        popover: "slide-in-from-bottom-2",
      },
      center: {
        popover: "",
      },
    },
    isFocused: {
      true: {
        item: "bg-accent text-accent-foreground",
        checkboxItem: "bg-accent text-accent-foreground",
        radioItem: "bg-accent text-accent-foreground",
      },
    },
    isDisabled: {
      true: {
        item: "pointer-events-none opacity-50",
        checkboxItem: "pointer-events-none opacity-50",
        radioItem: "pointer-events-none opacity-50",
      },
    },
    isInset: {
      true: {
        item: "pl-8",
        header: "pl-8",
      },
    },
    isSeparator: {
      true: {
        header: "border-b-border -mx-1 mb-1 border-b px-3 pb-[0.625rem]",
      },
    },
  },
});
export type MenuStyles = VariantProps<typeof menuStyles>;
