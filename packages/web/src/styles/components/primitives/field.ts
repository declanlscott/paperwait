import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const labelStyles = tv({
  base: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  variants: {
    variant: {
      default: "",
      destructive: "text-red-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
export type LabelStyles = VariantProps<typeof labelStyles>;

export const fieldGroupStyles = tv({
  extend: focusRing,
  base: "relative flex h-10 w-full items-center overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
  variants: {
    isDisabled: {
      true: "cursor-not-allowed opacity-50",
    },
  },
});
export type FieldGroupStyles = VariantProps<typeof fieldGroupStyles>;
