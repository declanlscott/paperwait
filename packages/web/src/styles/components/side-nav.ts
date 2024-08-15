import { tv } from "tailwind-variants";

import { focusRingStyles } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const linkStyles = tv({
  extend: focusRingStyles,
  base: "rounded-md transition-colors py-2.5 text-muted-foreground font-medium flex items-center gap-3 [&>svg]:size-5",
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
