import { tv } from "tailwind-variants";

import { focusRingStyles } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const breadcrumbsStyles = tv({
  slots: {
    root: "text-muted-foreground flex flex-wrap items-center gap-1.5 break-words text-sm sm:gap-2.5",
    item: "inline-flex items-center gap-1.5 sm:gap-2.5",
    separator: "[&>svg]:size-3.5",
    ellipsis: "flex size-9 items-center justify-center",
    page: "text-foreground font-normal",
  },
});

export const breadcrumbLinkStyles = tv({
  extend: focusRingStyles,
  base: "transition-colors",
  variants: {
    isHovered: {
      true: "text-foreground",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
    isCurrent: {
      true: "pointer-events-auto opacity-100",
    },
  },
});
export type BreadcrumbLinkStyles = VariantProps<typeof breadcrumbLinkStyles>;
