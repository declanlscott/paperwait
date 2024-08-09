import {
  Input as AriaInput,
  NumberField as AriaNumberField,
  composeRenderProps,
} from "react-aria-components";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "~/app/components/ui/primitives/button";
import { numberFieldStyles } from "~/styles/components/primitives/number-field";

import type { ComponentProps } from "react";
import type { InputProps as AriaInputProps } from "react-aria-components";
import type { ButtonProps } from "~/app/components/ui/primitives/button";

export const NumberField = AriaNumberField;

export type NumberFieldInputProps = AriaInputProps;
export function NumberFieldInput({
  className,
  ...props
}: NumberFieldInputProps) {
  return (
    <AriaInput
      className={composeRenderProps(className, (className, renderProps) =>
        numberFieldStyles().root({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}

export type NumberFieldSteppersProps = ComponentProps<"div">;
export function NumberFieldSteppers({
  className,
  ...props
}: NumberFieldSteppersProps) {
  return (
    <div className={numberFieldStyles().steppers({ className })} {...props}>
      <NumberFieldStepper slot="increment">
        <ChevronUp aria-hidden className="size-4" />
      </NumberFieldStepper>

      <div className="border-b" />

      <NumberFieldStepper slot="decrement">
        <ChevronDown aria-hidden className="size-4" />
      </NumberFieldStepper>
    </div>
  );
}

export type NumberFieldStepperProps = ButtonProps;
export function NumberFieldStepper({
  className,
  ...props
}: NumberFieldStepperProps) {
  return (
    <Button
      className={composeRenderProps(className, (className, renderProps) =>
        numberFieldStyles().stepper({ className, ...renderProps }),
      )}
      variant="ghost"
      size="icon"
      {...props}
    />
  );
}
