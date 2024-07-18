import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const separatorStyles = tv({
  base: "bg-border shrink-0",
  variants: {
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
  },
});
export type SeparatorStyles = VariantProps<typeof separatorStyles>;
