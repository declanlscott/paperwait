import { forwardRef } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import { Dialog, DialogContent } from "~/app/components/ui/primitives/dialog";
import {
  commandDialogContentStyles,
  commandGroupStyles,
  commandInputStyles,
  commandItemStyles,
  commandListStyles,
  commandSeparatorStyles,
  commandShortcutStyles,
  commandStyles,
} from "~/shared/styles/components/command";

import type {
  ComponentPropsWithoutRef,
  ElementRef,
  HTMLAttributes,
} from "react";
import type { DialogProps as AriaDialogProps } from "react-aria-components";

export const Command = forwardRef<
  ElementRef<typeof CommandPrimitive>,
  ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={commandStyles({ className })}
    {...props}
  />
));

export type CommandDialogProps = AriaDialogProps;
export const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        {(values) => (
          <Command className={commandDialogContentStyles()}>
            {typeof children === "function" ? children(values) : children}
          </Command>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const CommandInput = forwardRef<
  ElementRef<typeof CommandPrimitive.Input>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />

    <CommandPrimitive.Input
      ref={ref}
      className={commandInputStyles({ className })}
      {...props}
    />
  </div>
));

export const CommandList = forwardRef<
  ElementRef<typeof CommandPrimitive.List>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={commandListStyles({ className })}
    {...props}
  />
));

export const CommandEmpty = forwardRef<
  ElementRef<typeof CommandPrimitive.Empty>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
));

export const CommandGroup = forwardRef<
  ElementRef<typeof CommandPrimitive.Group>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={commandGroupStyles({ className })}
    {...props}
  />
));

export const CommandSeparator = forwardRef<
  ElementRef<typeof CommandPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={commandSeparatorStyles({ className })}
    {...props}
  />
));

export const CommandItem = forwardRef<
  ElementRef<typeof CommandPrimitive.Item>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={commandItemStyles({ className })}
    {...props}
  />
));

export type CommandShortcutProps = HTMLAttributes<HTMLSpanElement>;
export const CommandShortcut = ({
  className,
  ...props
}: CommandShortcutProps) => {
  return <span className={commandShortcutStyles({ className })} {...props} />;
};
