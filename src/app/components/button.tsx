import { Button as AriaButton } from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTwRenderProps, focusRing } from "~/utils/tailwind";

import type { ButtonProps as AriaButtonProps } from "react-aria-components";
import type { VariantProps } from "tailwind-variants";

export const buttonVariants = tv({
  extend: focusRing,
  base: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  variants: {
    color: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline:
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    },
  },
  defaultVariants: {
    size: "default",
    color: "default",
  },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export type ButtonProps = AriaButtonProps & ButtonVariants;

export function Button(props: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={composeTwRenderProps(
        props.className,
        buttonVariants({ color: props.color, size: props.size }),
      )}
    />
  );
}
