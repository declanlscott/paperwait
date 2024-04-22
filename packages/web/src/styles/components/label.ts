import { tv } from "tailwind-variants";

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
