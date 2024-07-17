import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const tabsStyles = tv({
  base: "group flex flex-col gap-2",
  variants: {
    orientation: {
      horizontal: "flex-col",
      vertical: "flex-row",
    },
  },
});
export type TabsStyles = VariantProps<typeof tabsStyles>;

export const tabListStyles = tv({
  base: "bg-muted text-muted-foreground inline-flex h-10 items-center justify-center rounded-md p-1",
  variants: {
    orientation: {
      horizontal: "flex-row",
      vertical: "h-auto flex-col",
    },
  },
});
export type TabListStyles = VariantProps<typeof tabListStyles>;

export const tabStyles = tv({
  base: "ring-offset-background inline-flex cursor-pointer justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium outline-none transition-all group-data-[orientation=vertical]:w-full",
  variants: {
    isFocusVisible: {
      true: "ring-ring ring-2 ring-offset-2",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
    isSelected: {
      true: "bg-background text-foreground shadow-sm",
    },
  },
});
export type TabStyles = VariantProps<typeof tabStyles>;

export const tabPanelStyles = tv({
  base: "ring-offset-background mt-2",
  variants: {
    isFocusVisible: {
      true: "ring-ring outline-none ring-2 ring-offset-2",
    },
  },
});
export type TabPanelStyles = VariantProps<typeof tabPanelStyles>;
