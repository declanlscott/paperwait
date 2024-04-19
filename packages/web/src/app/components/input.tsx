import { Input as AriaInput } from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTwRenderProps, focusRing } from "~/styles/utils";

import type { InputProps as AriaInputProps } from "react-aria-components";
import type { VariantProps } from "tailwind-variants";

export const inputVariants = tv({
  extend: focusRing,
  base: "input",
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
