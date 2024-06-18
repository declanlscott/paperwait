import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const comboboxInputStyles = tv({
  base: "flex w-full bg-background px-3 py-2 text-sm placeholder:text-muted-foreground outline-none",
  variants: {
    isDisabled: {
      true: "cursor-not-allowed opacity-50",
    },
  },
});
export type ComboboxInputStyles = VariantProps<typeof comboboxInputStyles>;

export const comboboxLabelStyles = tv({
  base: "py-1.5 pl-8 pr-2 text-sm font-semibold",
  variants: {
    separator: {
      true: "-mx-1 mb-1 border-b border-b-border px-3 pb-[0.625rem]",
    },
    offset: {
      true: "px-3",
    },
  },
});
export type ComboboxLabelStyles = VariantProps<typeof comboboxLabelStyles>;

export const comboboxItemStyles = tv({
  base: "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
  variants: {
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
    isFocused: {
      true: "bg-accent text-accent-foreground",
    },
  },
});
export type ComboboxItemStyles = VariantProps<typeof comboboxItemStyles>;

export const comboboxSeparatorStyles = tv({
  base: "-mx-1 my-1 h-px bg-muted",
});
export type ComboboxSeparatorStyles = VariantProps<
  typeof comboboxSeparatorStyles
>;

export const comboboxPopoverStyles = tv({
  base: "relative z-50 w-[--trigger-width]  overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md",
  variants: {
    isEntering: {
      true: "animate-in fade-in-0",
    },
    isExiting: {
      true: "animate-out fade-out-0 zoom-out-95",
    },
    placement: {
      bottom: "slide-in-from-top-2 translate-y-1",
      left: "slide-in-from-right-2 -translate-x-1",
      right: "slide-in-from-left-2 translate-x-1",
      top: "slide-in-from-bottom-2 -translate-y-1",
      center: "",
    },
  },
});
export type ComboboxPopoverStyles = VariantProps<typeof comboboxPopoverStyles>;

export const comboboxListBoxStyles = tv({
  base: "p-1",
});
export type ComboboxListBoxStyles = VariantProps<typeof comboboxListBoxStyles>;
