import { tv } from "tailwind-variants";

import { focusRing } from "~/shared/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const buttonStyles = tv({
  extend: focusRing,
  base: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      outline: "border border-input bg-background",
      secondary: "bg-secondary text-secondary-foreground",
      ghost: "",
      link: "text-primary underline-offset-4",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "size-10",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
    isHtml: {
      true: "disabled:pointer-events-none disabled:opacity-50",
    },
  },
  compoundVariants: [
    {
      variant: "default",
      isHovered: true,
      className: "bg-primary/90",
    },
    {
      variant: "destructive",
      isHovered: true,
      className: "bg-destructive/90",
    },
    {
      variant: "outline",
      isHovered: true,
      className: "bg-accent text-accent-foreground",
    },
    {
      variant: "secondary",
      isHovered: true,
      className: "bg-secondary/80",
    },
    {
      variant: "ghost",
      isHovered: true,
      className: "bg-accent text-accent-foreground",
    },
    {
      variant: "link",
      isHovered: true,
      className: "underline",
    },
    {
      variant: "default",
      isHtml: true,
      className: "hover:bg-primary/90",
    },
    {
      variant: "destructive",
      isHtml: true,
      className: "hover:bg-destructive/90",
    },
    {
      variant: "outline",
      isHtml: true,
      className: "hover:bg-accent hover:text-accent-foreground",
    },
    {
      variant: "secondary",
      isHtml: true,
      className: "hover:bg-secondary/80",
    },
    {
      variant: "ghost",
      isHtml: true,
      className: "hover:bg-accent hover:text-accent-foreground",
    },
    {
      variant: "link",
      isHtml: true,
      className: "hover:underline",
    },
  ],
  defaultVariants: {
    size: "default",
    variant: "default",
  },
});

export type ButtonStyles = VariantProps<typeof buttonStyles>;
