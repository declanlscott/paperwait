import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const inputStyles = tv({
  extend: focusRing,
  base: "flex h-10 w-full rounded-md border px-3 py-2 bg-background text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    variant: {
      default: "border-input",
      error: "border-red-500 text-red-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type InputStyles = VariantProps<typeof inputStyles>;
