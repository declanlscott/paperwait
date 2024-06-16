import { tv } from "tailwind-variants";

import { focusRing } from "~/shared/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const inputStyles = tv({
  extend: focusRing,
  base: "flex h-10 w-full rounded-md border px-3 py-2 bg-background text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    variant: {
      default: "border-input placeholder:text-muted-foreground",
      destructive:
        "border-destructive text-destructive placeholder:text-destructive/50",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type InputStyles = VariantProps<typeof inputStyles>;
