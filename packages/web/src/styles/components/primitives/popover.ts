import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const popoverStyles = tv({
  base: "bg-popover text-popover-foreground z-50 rounded-md border shadow-md outline-none",
  variants: {
    isEntering: {
      true: "animate-in fade-in-0 zoom-in-95",
    },
    isExiting: {
      true: "animate-out fade-out-0 zoom-out-95",
    },
    placement: {
      bottom: "slide-in-from-top-2",
      left: "slide-in-from-right-2",
      right: "slide-in-from-left-2",
      top: "slide-in-from-bottom-2",
      center: "",
    },
  },
});
export type PopoverStyles = VariantProps<typeof popoverStyles>;

export const popoverDialogStyles = tv({
  base: "p-4 outline outline-0",
});
export type PopoverDialogStyles = VariantProps<typeof popoverDialogStyles>;
