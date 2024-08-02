import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const tooltipStyles = tv({
  base: "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95",
  variants: {
    variant: {
      placement: {
        bottom: "slide-in-from-top-2",
        left: "slide-in-from-right-2",
        right: "slide-in-from-left-2",
        top: "slide-in-from-bottom-2",
      },
    },
  },
});

export type TooltipStyles = VariantProps<typeof tooltipStyles>;
