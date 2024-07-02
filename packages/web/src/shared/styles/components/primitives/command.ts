import { tv } from "tailwind-variants";

import { focusRing } from "~/shared/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const commandStyles = tv({
  base: "bg-popover text-popover-foreground flex size-full flex-col overflow-hidden rounded-md",
});
export type CommandStyles = VariantProps<typeof commandStyles>;

export const commandDialogContentStyles = tv({
  base: "[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:size-5",
});
export type CommandDialogContentStyles = VariantProps<
  typeof commandDialogContentStyles
>;

export const commandInputStyles = tv({
  base: "placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
});
export type CommandInputStyles = VariantProps<typeof commandInputStyles>;

export const commandBackButtonStyles = tv({
  extend: focusRing,
  base: "ring-offset-background mr-2 shrink-0 text-primary/50 transition-colors rounded-sm",
  variants: {
    isHovered: {
      true: "text-primary/100",
    },
  },
});

export const commandListStyles = tv({
  base: "max-h-[300px] overflow-y-auto overflow-x-hidden",
});
export type CommandListStyles = VariantProps<typeof commandListStyles>;

export const commandGroupStyles = tv({
  base: "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
});
export type CommandGroupStyles = VariantProps<typeof commandGroupStyles>;

export const commandSeparatorStyles = tv({
  base: "bg-border -mx-1 h-px",
});
export type CommandSeparatorStyles = VariantProps<
  typeof commandSeparatorStyles
>;

export const commandItemStyles = tv({
  base: "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
});
export type CommandItemStyles = VariantProps<typeof commandItemStyles>;

export const commandShortcutStyles = tv({
  base: "text-muted-foreground ml-auto text-xs tracking-widest",
});
export type CommandShortcutStyles = VariantProps<typeof commandShortcutStyles>;
