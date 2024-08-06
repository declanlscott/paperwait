import { tv } from "tailwind-variants";

import { popoverStyles } from "~/styles/components/primitives/popover";

import type { VariantProps } from "tailwind-variants";

export const comboboxStyles = tv({
  slots: {
    root: "group flex flex-col gap-2",
    input:
      "bg-background placeholder:text-muted-foreground flex h-10 w-full px-3 py-2 outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium",
    listBox:
      "max-h-[inherit] overflow-auto p-1 outline-none [clip-path:inset(0_0_0_0_round_calc(var(--radius)-2px))]",
  },
  variants: {
    isDisabled: {
      true: {
        input: "cursor-not-allowed opacity-50",
      },
    },
  },
});
export type ComboboxStyles = VariantProps<typeof comboboxStyles>;

export const comboboxPopoverStyles = tv({
  extend: popoverStyles,
  base: "w-[calc(var(--trigger-width)+4px)]",
});
export type ComboboxPopoverStyles = VariantProps<typeof comboboxPopoverStyles>;
