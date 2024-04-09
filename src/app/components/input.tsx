import { Input as AriaInput } from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTwRenderProps, focusRing } from "~/utils/tailwind";

import type { InputProps as AriaInputProps } from "react-aria-components";
import type { VariantProps } from "tailwind-variants";

export const inputVariants = tv({
  extend: focusRing,
  base: "border-input bg-background placeholder:text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium  disabled:cursor-not-allowed disabled:opacity-50",
});

export type InputVariants = VariantProps<typeof inputVariants>;

export type InputProps = AriaInputProps & InputVariants;

export function Input(props: InputProps) {
  return (
    <AriaInput
      {...props}
      className={composeTwRenderProps(props.className, inputVariants())}
    />
  );
}
