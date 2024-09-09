import { forwardRef } from "react";
import {
  Input as AriaInput,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  composeRenderProps,
} from "react-aria-components";

import {
  inputStyles,
  textAreaStyles,
} from "~/styles/components/primitives/text-field";

import type {
  InputProps as AriaInputProps,
  TextAreaProps as AriaTextAreaProps,
} from "react-aria-components";
import type {
  InputStyles,
  TextAreaStyles,
} from "~/styles/components/primitives/text-field";

export const TextField = AriaTextField;

export interface InputProps extends AriaInputProps, InputStyles {}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <AriaInput
      {...props}
      ref={ref}
      className={composeRenderProps(className, (className, renderProps) =>
        inputStyles({ className, ...renderProps }),
      )}
    />
  ),
);

export interface TextAreaProps extends AriaTextAreaProps, TextAreaStyles {}
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => (
    <AriaTextArea
      {...props}
      ref={ref}
      className={composeRenderProps(className, (className, renderProps) =>
        textAreaStyles({ className, ...renderProps }),
      )}
    />
  ),
);
