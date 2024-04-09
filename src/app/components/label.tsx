import { Label as AriaLabel } from "react-aria-components";
import { tv } from "tailwind-variants";

import { cn } from "~/utils/tailwind";

import type { LabelProps as AriaLabelProps } from "react-aria-components";
import type { VariantProps } from "tailwind-variants";

export const labelVariants = tv({
  base: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
});

export type LabelVariants = VariantProps<typeof labelVariants>;

export type LabelProps = AriaLabelProps & LabelVariants;

export function Label(props: LabelProps) {
  return (
    <AriaLabel {...props} className={cn(labelVariants(), props.className)} />
  );
}
