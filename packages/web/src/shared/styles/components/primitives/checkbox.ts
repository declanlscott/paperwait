import { tv } from "tailwind-variants";

import { focusRing } from "~/shared/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const checkboxStyles = tv({
  base: "flex gap-2 items-center",
  variants: {
    isDisabled: {
      false: "text-primary",
      true: "text-primary/50 pointer-events-none",
    },
  },
});
export type CheckboxStyles = VariantProps<typeof checkboxStyles>;

export const boxStyles = tv({
  extend: focusRing,
  base: "size-4 shrink-0 rounded-sm flex items-center justify-center border border-primary disabled:border-primary/50 disabled:pointer-events-none",
  variants: {
    isSelected: {
      false: "bg-white",
      true: "bg-primary",
    },
    isDisabled: {
      false: "border-primary",
      true: "border-primary/50",
    },
  },
  compoundVariants: [
    {
      isSelected: true,
      isDisabled: true,
      className: "bg-primary/50",
    },
  ],
});
export type BoxStyles = VariantProps<typeof boxStyles>;

export const checkStyles = "size-4 text-primary-foreground";
