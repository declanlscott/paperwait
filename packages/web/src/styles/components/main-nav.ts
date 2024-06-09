import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const linkStyles = tv({
  base: "text-muted-foreground text-sm font-medium transition-colors p-3 cursor-pointer outline-none",
  variants: {
    isActive: {
      true: "text-primary",
    },
    isHovered: {
      true: "text-primary",
    },
  },
});
export type LinkStyles = VariantProps<typeof linkStyles>;
