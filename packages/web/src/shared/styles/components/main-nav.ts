import { tv } from "tailwind-variants";

import { focusRing } from "~/shared/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const logoStyles = tv({
  base: "focus-visible:ring-ring flex h-11 w-9 items-center overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  variants: {
    isAnimating: {
      true: "animate-pulse",
    },
  },
});
export type LogoStyles = VariantProps<typeof logoStyles>;

export const linkStyles = tv({
  extend: focusRing,
  base: "text-muted-foreground text-sm font-medium transition-colors p-3 cursor-pointer outline-none rounded-md",
  variants: {
    isActive: {
      true: "text-primary bg-accent lg:bg-transparent",
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
