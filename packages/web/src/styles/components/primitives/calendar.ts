import { tv } from "tailwind-variants";

import { buttonStyles } from "~/styles/components/primitives/button";

import type { VariantProps } from "tailwind-variants";

export const calendarStyles = tv({
  slots: {
    root: "w-fit",
    grid: "border-separate border-spacing-x-0 border-spacing-y-1",
    headerCell:
      "text-muted-foreground w-9 rounded-md text-[0.8rem] font-normal",
    gridBody: "[&>tr>td]:p-0",
  },
});

export const calendarHeadingButtonStyles = tv({
  extend: buttonStyles,
  base: "size-7 bg-transparent p-0 opacity-50",
  variants: {
    isHovered: {
      true: "opacity-100",
    },
  },
});
export type CalendarHeadingButtonStyles = VariantProps<
  typeof calendarHeadingButtonStyles
>;

export const calendarCellStyles = tv({
  extend: buttonStyles,
  base: "relative flex size-9 items-center justify-center p-0 text-sm font-normal",
  variants: {
    isDisabled: {
      true: "text-muted-foreground opacity-50",
    },
    isSelected: {
      true: "bg-primary text-primary-foreground data-[focused]:bg-primary data-[focused]:text-primary-foreground",
    },
    isHovered: {
      true: "bg-primary text-primary-foreground",
    },
    isOutsideMonth: {
      true: "text-muted-foreground opacity-50",
    },
    isUnavailable: {
      true: "text-destructive cursor-default",
    },
    isInvalid: {
      true: "bg-destructive text-destructive-foreground",
    },
    isRange: {
      true: "",
    },
    isCurrentDate: {
      true: "",
    },
  },
  compoundVariants: [
    {
      isSelected: true,
      isRange: true,
      isSelectionStart: false,
      isSelectionEnd: false,
      className: "bg-accent text-accent-foreground rounded-none",
    },
    {
      isOutsideMonth: true,
      isSelected: true,
      className: "bg-accent/50 opacity-30",
    },
    {
      isCurrentDate: true,
      isSelected: false,
      className: "bg-accent text-accent-foreground",
    },
    {
      isInvalid: true,
      isFocused: true,
      className: "bg-destructive text-destructive-foreground",
    },
    {
      isInvalid: true,
      isHovered: true,
      className: "bg-destructive text-destructive-foreground",
    },
  ],
});
export type CalendarCellStyles = VariantProps<typeof calendarCellStyles>;
