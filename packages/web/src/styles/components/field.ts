import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const labelStyles = tv({
  base: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  variants: {
    variant: {
      default: "",
      error: "text-red-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
export type LabelStyles = VariantProps<typeof labelStyles>;

export const fieldGroupStyles = tv({
  extend: focusRing,
  base: "group flex h-10 justify-between overflow-hidden rounded-md border border-input bg-background text-sm",
  variants: {
    isDisabled: {
      true: "cursor-not-allowed opacity-50",
    },
  },
});
export type FieldGroupStyles = VariantProps<typeof fieldGroupStyles>;
