import { tv } from "tailwind-variants";

import { focusRing } from "~/shared/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const linkStyles = tv({
  extend: focusRing,
  base: "rounded-md transition-colors py-2.5 text-muted-foreground font-medium",
  variants: {
    isActive: {
      true: "text-primary",
    },
    isHovered: {
      true: "text-primary/80",
    },
  },
  compoundVariants: [
    {
      isActive: true,
      isHovered: true,
      className: "text-primary",
    },
  ],
});
export type LinkStyles = VariantProps<typeof linkStyles>;
