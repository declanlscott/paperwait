import {
  Checkbox as AriaCheckbox,
  CheckboxGroup as AriaCheckboxGroup,
  composeRenderProps,
} from "react-aria-components";
import { Check, Minus } from "lucide-react";

import {
  Description,
  FieldError,
  Label,
} from "~/app/components/ui/primitives/field";
import {
  boxStyles,
  checkboxStyles,
  checkStyles,
} from "~/styles/components/primitives/checkbox";
import { composeTwRenderProps } from "~/styles/utils";

import type { ReactNode } from "react";
import type {
  CheckboxGroupProps as AriaCheckboxGroupProps,
  CheckboxProps as AriaCheckboxProps,
  ValidationResult,
} from "react-aria-components";
import type { CheckboxStyles } from "~/styles/components/primitives/checkbox";

export interface CheckboxProps extends AriaCheckboxProps, CheckboxStyles {}

export function Checkbox(props: CheckboxProps) {
  return (
    <AriaCheckbox
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        checkboxStyles({ ...renderProps, className }),
      )}
    >
      {({ isSelected, isIndeterminate, ...renderProps }) => (
        <>
          <div
            className={boxStyles({
              isSelected: isSelected || isIndeterminate,
              ...renderProps,
            })}
          >
            {isIndeterminate ? (
              <Minus aria-hidden className={checkStyles} />
            ) : isSelected ? (
              <Check aria-hidden className={checkStyles} />
            ) : null}
          </div>

          {props.children}
        </>
      )}
    </AriaCheckbox>
  );
}

export interface CheckboxGroupProps
  extends Omit<AriaCheckboxGroupProps, "children"> {
  children?: ReactNode;
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function CheckboxGroup(props: CheckboxGroupProps) {
  return (
    <AriaCheckboxGroup
      {...props}
      className={composeTwRenderProps(props.className, "flex flex-col gap-2")}
    >
      <Label>{props.label}</Label>

      {props.children}

      {props.description && <Description>{props.description}</Description>}

      <FieldError>{props.errorMessage}</FieldError>
    </AriaCheckboxGroup>
  );
}
