import {
  Button as AriaButton,
  ListBox as AriaListBox,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  composeRenderProps,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";

import {
  ListBoxCollection,
  ListBoxHeader,
  ListBoxItem,
  ListBoxSection,
} from "~/app/components/ui/primitives/list-box";
import { Popover } from "~/app/components/ui/primitives/popover";
import {
  selectPopoverStyles,
  selectStyles,
  selectTriggerStyles,
} from "~/styles/components/primitives/select";

import type {
  ButtonProps as AriaButtonProps,
  ListBoxProps as AriaListBoxProps,
  PopoverProps as AriaPopoverProps,
  SelectValueProps as AriaSelectValueProps,
} from "react-aria-components";

export const Select = AriaSelect;

export const SelectItem = ListBoxItem;

export const SelectHeader = ListBoxHeader;

export const SelectSection = ListBoxSection;

export const SelectCollection = ListBoxCollection;

export type SelectValueProps<T extends object> = AriaSelectValueProps<T>;
export const SelectValue = <T extends object>({
  className,
  ...props
}: SelectValueProps<T>) => (
  <AriaSelectValue
    className={composeRenderProps(className, (className, renderProps) =>
      selectStyles().value({ className, ...renderProps }),
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
      selectTriggerStyles({ className, ...renderProps }),
    )}
    {...props}
  >
    {composeRenderProps(children, (children) => (
      <>
        {children}
        <ChevronDown aria-hidden="true" className="size-4 opacity-50" />
      </>
    ))}
  </AriaButton>
);

export type SelectPopoverProps = AriaPopoverProps;
export const SelectPopover = ({ className, ...props }: SelectPopoverProps) => (
  <Popover
    className={composeRenderProps(className, (className, renderProps) =>
      selectPopoverStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type SelectListBoxProps<T extends object> = AriaListBoxProps<T>;
export const SelectListBox = <T extends object>({
  className,
  ...props
}: AriaListBoxProps<T>) => (
  <AriaListBox
    className={composeRenderProps(className, (className, renderProps) =>
      selectStyles().listBox({ className, ...renderProps }),
    )}
    {...props}
  />
);
