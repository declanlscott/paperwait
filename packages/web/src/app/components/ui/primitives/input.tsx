import { Input as AriaInput } from "react-aria-components";

import { inputStyles } from "~/shared/styles/components/input";
import { composeTwRenderProps } from "~/shared/styles/utils";

import type { InputProps as AriaInputProps } from "react-aria-components";
import type { InputStyles } from "~/shared/styles/components/input";

export interface InputProps extends AriaInputProps, InputStyles {}

export function Input(props: InputProps) {
  return (
    <AriaInput
      {...props}
      className={composeTwRenderProps(props.className, inputStyles())}
    />
  );
}
