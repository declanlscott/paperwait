import { tv } from "tailwind-variants";

import { popoverStyles } from "~/styles/components/primitives/popover";

import type { VariantProps } from "tailwind-variants";

export const comboboxInputStyles = tv({
  base: "bg-background placeholder:text-muted-foreground flex h-10 w-full px-3 py-2 outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium",
  variants: {
    isDisabled: {
      true: "cursor-not-allowed opacity-50",
    },
  },
});
export type ComboboxInputStyles = VariantProps<typeof comboboxInputStyles>;

export const comboboxPopoverStyles = tv({
  extend: popoverStyles,
  base: "w-[calc(var(--trigger-width)+4px)]",
});
export type ComboboxPopoverStyles = VariantProps<typeof comboboxPopoverStyles>;

export const comboboxListBoxStyles = tv({
  base: "max-h-[inherit] overflow-auto p-1 outline-none [clip-path:inset(0_0_0_0_round_calc(var(--radius)-2px))]",
});
export type ComboboxListBoxStyles = VariantProps<typeof comboboxListBoxStyles>;

export const comboboxStyles = tv({
  base: "group flex flex-col gap-2",
});
export type ComboboxStyles = VariantProps<typeof comboboxStyles>;
