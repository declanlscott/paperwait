import {
  ComboBox as AriaCombobox,
  Input as AriaInput,
  ListBox as AriaListBox,
  Text as AriaText,
  composeRenderProps,
} from "react-aria-components";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "~/app/components/ui/primitives/button";
import {
  FieldError,
  FieldGroup,
  Label,
} from "~/app/components/ui/primitives/field";
import {
  ListBoxCollection,
  ListBoxHeader,
  ListBoxItem,
  ListBoxSection,
} from "~/app/components/ui/primitives/list-box";
import { Popover } from "~/app/components/ui/primitives/popover";
import {
  comboboxInputStyles,
  comboboxListBoxStyles,
  comboboxPopoverStyles,
  comboboxStyles,
} from "~/styles/components/primitives/combobox";

import type { ReactNode } from "react";
import type {
  ComboBoxProps as AriaComboboxProps,
  InputProps as AriaInputProps,
  ListBoxProps as AriaListBoxProps,
  PopoverProps as AriaPopoverProps,
  ValidationResult as AriaValidationResult,
} from "react-aria-components";

export const BaseCombobox = AriaCombobox;

export const ComboboxItem = ListBoxItem;

export const ComboboxHeader = ListBoxHeader;

export const ComboboxSection = ListBoxSection;

export const ComboboxCollection = ListBoxCollection;

export type ComboboxInputProps = AriaInputProps;
export const ComboboxInput = ({ className, ...props }: ComboboxInputProps) => (
  <AriaInput
    className={composeRenderProps(className, (className, renderProps) =>
      comboboxInputStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type ComboboxPopoverProps = AriaPopoverProps;
export const ComboboxPopover = ({ className, ...props }: AriaPopoverProps) => (
  <Popover
    className={composeRenderProps(className, (className, renderProps) =>
      comboboxPopoverStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type ComboboxListBoxProps<T extends object> = AriaListBoxProps<T>;
export const ComboboxListBox = <T extends object>({
  className,
  ...props
}: ComboboxListBoxProps<T>) => (
  <AriaListBox
    className={composeRenderProps(className, (className, renderProps) =>
      comboboxListBoxStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export interface ComboboxProps<T extends object>
  extends Omit<AriaComboboxProps<T>, "children"> {
  label?: string;
  description?: string | null;
  errorMessage?: string | ((validation: AriaValidationResult) => string);
  children: ReactNode | ((item: T) => ReactNode);
}
export const Combobox = <T extends object>({
  label,
  description,
  errorMessage,
  className,
  children,
  ...props
}: ComboboxProps<T>) => (
  <Combobox
    className={composeRenderProps(className, (className, renderProps) =>
      comboboxStyles({ className, ...renderProps }),
    )}
    {...props}
  >
    <Label>{label}</Label>

    <FieldGroup className="p-0">
      <ComboboxInput />

      <Button variant="ghost" size="icon" className="mr-1 size-6 p-1">
        <ChevronsUpDown aria-hidden="true" className="size-4 opacity-50" />
      </Button>
    </FieldGroup>

    {description && (
      <AriaText className="text-muted-foreground text-sm" slot="description">
        {description}
      </AriaText>
    )}

    <FieldError>{errorMessage}</FieldError>

    <ComboboxPopover>
      <ComboboxListBox>{children}</ComboboxListBox>
    </ComboboxPopover>
  </Combobox>
);
