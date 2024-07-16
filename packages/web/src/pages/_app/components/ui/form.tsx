import { forwardRef } from "react";
import { TextField as AriaTextField } from "react-aria-components";

import { FieldError, Label } from "~/app/components/ui/primitives/field";
import { Input } from "~/app/components/ui/primitives/input";

import type { ReadonlySignal } from "@preact/signals-react";
import type { InputProps } from "~/app/components/ui/primitives/input";

export interface TextInputProps extends Omit<InputProps, "type" | "value"> {
  type: "text" | "email" | "tel" | "password" | "url" | "date";
  label?: string;
  value: ReadonlySignal<string | undefined>;
  error: ReadonlySignal<string>;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, value, error, ...props }, ref) => {
    const { name, required } = props;

    return (
      <AriaTextField className="grow">
        {label && (
          <Label htmlFor={name}>
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
        )}

        <Input
          {...props}
          ref={ref}
          id={name}
          value={value.value ?? ""}
          aria-invalid={!!error.value}
          aria-errormessage={`${name}-error`}
        />

        <FieldError>{error.value}</FieldError>
      </AriaTextField>
    );
  },
);
