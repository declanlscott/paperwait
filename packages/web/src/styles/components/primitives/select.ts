import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const selectStyles = tv({
  base: "border-input bg-background ring-offset-background placeholder:text-muted-foreground flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm ",
  variants: {
    isHtml: {
      true: "focus:ring-ring focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
    },
  },
});
export type SelectStyles = VariantProps<typeof selectStyles>;

export const selectValueStyles = tv({
  variants: {
    isPlaceholder: {
      true: "text-muted-foreground",
    },
  },
});
export type SelectValueStyles = VariantProps<typeof selectValueStyles>;

export const selectTriggerStyles = tv({
  extend: focusRing,
  base: "border-input bg-background flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
  variants: {
    isDisabled: {
      true: "cursor-not-allowed opacity-50",
    },
  },
});
export type SelectTriggerStyles = VariantProps<typeof selectTriggerStyles>;

export const selectHeaderStyles = tv({
  base: "py-1.5 pl-8 pr-2 text-sm font-semibold",
});
export type SelectHeaderStyles = VariantProps<typeof selectHeaderStyles>;

export const selectItemStyles = tv({
  base: "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
  variants: {
    isFocused: {
      true: "bg-accent text-accent-foreground",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
  },
});
export type SelectItemStyles = VariantProps<typeof selectItemStyles>;

export const selectSeparatorStyles = tv({
  base: "-mx-1 my-1 h-px bg-muted",
});
export type SelectSeparatorStyles = VariantProps<typeof selectSeparatorStyles>;

export const selectPopoverStyles = tv({
  base: "relative z-50 w-[--trigger-width]  min-w-[8rem] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md",
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
export type SelectPopoverStyles = VariantProps<typeof selectPopoverStyles>;

export const selectContentStyles = tv({
  base: "p-1",
});
export type SelectContentStyles = VariantProps<typeof selectContentStyles>;
