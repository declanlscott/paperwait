import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const breadcrumbsStyles = tv({
  base: "text-muted-foreground flex flex-wrap items-center gap-1.5 break-words text-sm sm:gap-2.5",
});
export type BreadcrumbsStyles = VariantProps<typeof breadcrumbsStyles>;

export const breadcrumbItemStyles = tv({
  base: "inline-flex items-center gap-1.5 sm:gap-2.5",
});
export type BreadcrumbItemStyles = VariantProps<typeof breadcrumbItemStyles>;

export const breadcrumbLinkStyles = tv({
  extend: focusRing,
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

export const breadcrumbSeparatorStyles = tv({
  base: "[&>svg]:size-3.5",
});
export type BreadcrumbSeparatorStyles = VariantProps<
  typeof breadcrumbSeparatorStyles
>;

export const breadcrumbEllipsisStyles = tv({
  base: "flex size-9 items-center justify-center",
});
export type BreadcrumbEllipsisStyles = VariantProps<
  typeof breadcrumbEllipsisStyles
>;

export const breadcrumbPageStyles = tv({
  base: "text-foreground font-normal",
});
export type BreadcrumbPageStyles = VariantProps<typeof breadcrumbPageStyles>;
