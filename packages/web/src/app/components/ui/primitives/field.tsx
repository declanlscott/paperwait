import {
  FieldError as AriaFieldError,
  Label as AriaLabel,
  Text as AriaText,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { labelStyles } from "~/styles/components/label";
import { composeTwRenderProps } from "~/styles/utils";

import type {
  FieldErrorProps as AriaFieldErrorProps,
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
