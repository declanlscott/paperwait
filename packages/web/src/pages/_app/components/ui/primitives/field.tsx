import {
  FieldError as AriaFieldError,
  Group as AriaGroup,
  Label as AriaLabel,
  Text as AriaText,
  composeRenderProps,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";

import {
  fieldGroupStyles,
  labelStyles,
} from "~/styles/components/primitives/field";
import { composeTwRenderProps } from "~/styles/utils";

import type {
  FieldErrorProps as AriaFieldErrorProps,
  GroupProps as AriaGroupProps,
  LabelProps as AriaLabelProps,
  TextProps as AriaTextProps,
} from "react-aria-components";

export type LabelProps = AriaLabelProps;
export function Label({ className, ...props }: LabelProps) {
  return <AriaLabel {...props} className={labelStyles({ className })} />;
}

export type DescriptionProps = AriaTextProps;
export function Description(props: DescriptionProps) {
  return (
    <AriaText
      {...props}
      slot="description"
      className={twMerge("text-muted-foreground text-sm")}
    />
  );
}

export type FieldErrorProps = AriaFieldErrorProps;
export function FieldError(props: FieldErrorProps) {
  return (
    <AriaFieldError
      {...props}
      className={composeTwRenderProps(props.className, "text-sm text-red-500")}
    />
  );
}

export type FieldGroupProps = AriaGroupProps;
export function FieldGroup(props: FieldGroupProps) {
  return (
    <AriaGroup
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        fieldGroupStyles({ ...renderProps, className }),
      )}
    />
  );
}
