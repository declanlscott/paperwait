import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const menuPopoverStyles = tv({
  base: "bg-popover text-popover-foreground z-50 rounded-md shadow-md",
  variants: {
    isEntering: {
      true: "animate-in fade-in-0",
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
export type MenuPopoverStyles = VariantProps<typeof menuPopoverStyles>;

export const menuStyles = tv({
  base: "max-h-[inherit] overflow-auto rounded-md border p-1 outline outline-0 [clip-path:inset(0_0_0_0_round_calc(var(--radius)-2px))]",
});
export type MenuStyles = VariantProps<typeof menuStyles>;

export const menuItemStyles = tv({
  base: "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
  variants: {
    isFocused: {
      true: "bg-accent text-accent-foreground",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
    isInset: {
      true: "pl-8",
    },
  },
});
export type MenuItemStyles = VariantProps<typeof menuItemStyles>;

export const menuHeaderStyles = tv({
  base: "px-2 py-1.5 text-sm font-semibold",
  variants: {
    isInset: {
      true: "pl-8",
    },
    isSeparator: {
      true: "border-b-border -mx-1 mb-1 border-b px-3 pb-[0.625rem]",
    },
  },
});
export type MenuHeaderStyles = VariantProps<typeof menuHeaderStyles>;

export const menuSeparatorStyles = tv({
  base: "bg-muted -mx-1 my-1 h-px",
});
export type MenuSeparatorStyles = VariantProps<typeof menuSeparatorStyles>;

export const menuKeyboardStyles = tv({
  base: "ml-auto text-xs tracking-widest opacity-60",
});
export type MenuKeyboardStyles = VariantProps<typeof menuKeyboardStyles>;

export const menuCheckboxItemStyles = tv({
  base: "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
  variants: {
    isFocused: {
      true: "bg-accent text-accent-foreground",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
  },
});
export type MenuCheckboxItemStyles = VariantProps<
  typeof menuCheckboxItemStyles
>;

export const menuRadioItemStyles = menuCheckboxItemStyles;
export type MenuRadioItemStyles = VariantProps<typeof menuRadioItemStyles>;
