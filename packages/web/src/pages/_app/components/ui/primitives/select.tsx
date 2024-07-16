import {
  Button as AriaButton,
  Collection as AriaCollection,
  Header as AriaHeader,
  ListBox as AriaListBox,
  Popover as AriaPopover,
  Section as AriaSection,
  Select as AriaSelect,
  ListBoxItem as AriaSelectBoxItem,
  SelectValue as AriaSelectValue,
  Separator as AriaSeparator,
  composeRenderProps,
} from "react-aria-components";
import { Check, ChevronDown } from "lucide-react";

import {
  selectContentStyles,
  selectHeaderStyles,
  selectItemStyles,
  selectPopoverStyles,
  selectSeparatorStyles,
  selectTriggerStyles,
  selectValueStyles,
} from "~/shared/styles/components/primitives/select";

import type { ComponentProps } from "react";
import type {
  ButtonProps as AriaButtonProps,
  ListBoxItemProps as AriaListBoxItemProps,
  ListBoxProps as AriaListBoxProps,
  PopoverProps as AriaPopoverProps,
  SelectValueProps as AriaSelectValueProps,
  SeparatorProps as AriaSeparatorProps,
} from "react-aria-components";

export const Select = AriaSelect;

export const SelectSection = AriaSection;

export const SelectCollection = AriaCollection;

export type SelectValueProps<T extends object> = AriaSelectValueProps<T>;
export const SelectValue = <T extends object>({
  className,
  ...props
}: SelectValueProps<T>) => (
  <AriaSelectValue
    className={composeRenderProps(className, (className, renderProps) =>
      selectValueStyles({ ...renderProps, className }),
    )}
    {...props}
  />
);

export type SelectTriggerProps = AriaButtonProps;
export const SelectTrigger = ({
  className,
  children,
  ...props
}: SelectTriggerProps) => (
  <AriaButton
    className={composeRenderProps(className, (className, renderProps) =>
      selectTriggerStyles({ ...renderProps, className }),
    )}
    {...props}
  >
    {(values) => (
      <>
        {typeof children === "function" ? children(values) : children}
        <ChevronDown aria-hidden="true" className="size-4 opacity-50" />
      </>
    )}
  </AriaButton>
);

export type SelectHeaderProps = ComponentProps<typeof AriaHeader>;
export const SelectHeader = ({ className, ...props }: SelectHeaderProps) => (
  <AriaHeader className={selectHeaderStyles({ className })} {...props} />
);

export type SelectItemProps = AriaListBoxItemProps;
export const SelectItem = ({
  className,
  children,
  ...props
}: SelectItemProps) => (
  <AriaSelectBoxItem
    className={composeRenderProps(className, (className, renderProps) =>
      selectItemStyles({ ...renderProps, className }),
    )}
    {...props}
  >
    {(values) => (
      <>
        {values.isSelected && (
          <span className="absolute left-2 flex size-4 items-center justify-center">
            <Check className="size-4" />
          </span>
        )}
        {typeof children === "function" ? children(values) : children}
      </>
    )}
  </AriaSelectBoxItem>
);

export type SelectSeparatorProps = AriaSeparatorProps;
export const SelectSeparator = ({
  className,
  ...props
}: SelectSeparatorProps) => (
  <AriaSeparator className={selectSeparatorStyles({ className })} {...props} />
);

export type SelectPopoverProps = AriaPopoverProps;
export const SelectPopover = ({
  className,
  offset = 0,
  ...props
}: SelectPopoverProps) => (
  <AriaPopover
    offset={offset}
    className={composeRenderProps(className, (className, renderProps) =>
      selectPopoverStyles({ ...renderProps, className }),
    )}
    {...props}
  />
);

export type SelectContentProps<T extends object> = AriaListBoxProps<T>;
export const SelectContent = <T extends object>({
  className,
  ...props
}: SelectContentProps<T>) => (
  <AriaListBox
    className={composeRenderProps(className, (className, renderProps) =>
      selectContentStyles({ ...renderProps, className }),
    )}
    {...props}
  />
);
