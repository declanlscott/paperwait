import { forwardRef } from "react";
import { Input as AriaInput, composeRenderProps } from "react-aria-components";

import { inputStyles } from "~/styles/components/primitives/input";

import type { InputProps as AriaInputProps } from "react-aria-components";
import type { InputStyles } from "~/styles/components/primitives/input";

export interface InputProps extends AriaInputProps, InputStyles {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <AriaInput
      {...props}
      ref={ref}
      className={composeRenderProps(className, (className, renderProps) =>
        inputStyles({ ...renderProps, className }),
      )}
    />
  ),
);
