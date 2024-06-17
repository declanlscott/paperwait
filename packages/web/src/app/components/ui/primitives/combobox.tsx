import {
  Button as AriaButton,
  ComboBox as AriaCombobox,
  Collection as AriaComboboxCollection,
  Section as AriaComboboxSection,
  Header as AriaHeader,
  Input as AriaInput,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  Popover as AriaPopover,
  Separator as AriaSeparator,
  composeRenderProps,
} from "react-aria-components";
import { Check, ChevronsUpDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

import { FieldGroup } from "~/app/components/ui/primitives/field";
import {
  comboboxInputStyles,
  comboboxItemStyles,
  comboboxLabelStyles,
  comboboxListBoxStyles,
  comboboxPopoverStyles,
  comboboxSeparatorStyles,
} from "~/shared/styles/components/combobox";

import type { ComponentProps, ReactNode } from "react";
import type {
  InputProps as AriaInputProps,
  ListBoxItemProps as AriaListBoxItemProps,
  ListBoxProps as AriaListBoxProps,
  PopoverProps as AriaPopoverProps,
  SeparatorProps as AriaSeparatorProps,
} from "react-aria-components";

export const Combobox = AriaCombobox;

export const ComboboxSection = AriaComboboxSection;

export const ComboboxCollection = AriaComboboxCollection;

export interface ComboboxInputProps extends AriaInputProps {
  icon?: ReactNode;
}
export function ComboboxInput({ icon, ...props }: ComboboxInputProps) {
  return (
    <FieldGroup>
      <div className="flex items-center pl-3">{icon}</div>

      <AriaInput
        {...props}
        className={composeRenderProps(
          props.className,
          (className, renderProps) =>
            comboboxInputStyles({ ...renderProps, className }),
        )}
      />

      <AriaButton className="pr-3">
        <ChevronsUpDown aria-hidden className="size-4 opacity-50" />
      </AriaButton>
    </FieldGroup>
  );
}

export interface ComboboxLabelProps extends ComponentProps<typeof AriaHeader> {
  separator?: boolean;
  offset?: boolean;
}
export function ComboboxLabel({
  className,
  separator = false,
  offset = false,
  ...props
}: ComboboxLabelProps) {
  return (
    <AriaHeader
      {...props}
      className={twMerge(comboboxLabelStyles({ separator, offset }), className)}
    />
  );
}

export type ComboboxItemProps = AriaListBoxItemProps;
export function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxItemProps) {
  return (
    <AriaListBoxItem
      {...props}
      className={composeRenderProps(className, (className, renderProps) =>
        comboboxItemStyles({ ...renderProps, className }),
      )}
    >
      {(values) => (
        <>
          {values.isSelected && (
            <span className="absolute left-2 size-4 items-center justify-center">
              <Check className="size-4" />
            </span>
          )}

          {typeof children === "function" ? children(values) : children}
        </>
      )}
    </AriaListBoxItem>
  );
}

export type ComboboxSeparatorProps = AriaSeparatorProps;
export function ComboboxSeparator(props: ComboboxSeparatorProps) {
  return (
    <AriaSeparator
      {...props}
      className={twMerge(comboboxSeparatorStyles(), props.className)}
    />
  );
}

export type ComboboxPopoverProps = AriaPopoverProps;
export function ComboboxPopover(props: ComboboxPopoverProps) {
  return (
    <AriaPopover
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        comboboxPopoverStyles({ ...renderProps, className }),
      )}
    />
  );
}

export type ComboboxListBoxProps<T extends object> = AriaListBoxProps<T>;
export function ComboboxListBox<T extends object>(
  props: ComboboxListBoxProps<T>,
) {
  return (
    <AriaListBox
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        comboboxListBoxStyles({ ...renderProps, className }),
      )}
    />
  );
}
