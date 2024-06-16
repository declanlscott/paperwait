import { Input as AriaInput, composeRenderProps } from "react-aria-components";

import { inputStyles } from "~/shared/styles/components/input";

import type { InputProps as AriaInputProps } from "react-aria-components";
import type { InputStyles } from "~/shared/styles/components/input";

export interface InputProps extends AriaInputProps, InputStyles {}

export function Input(props: InputProps) {
  return (
    <AriaInput
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        inputStyles({ ...renderProps, className }),
      )}
    />
  );
}
