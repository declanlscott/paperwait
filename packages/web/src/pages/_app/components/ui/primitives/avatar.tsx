import { forwardRef } from "react";
import * as RadixAvatar from "@radix-ui/react-avatar";

import { avatarStyles } from "~/styles/components/primitives/avatar";

import type { ComponentPropsWithoutRef, ElementRef } from "react";

export const Avatar = forwardRef<
  ElementRef<typeof RadixAvatar.Root>,
  ComponentPropsWithoutRef<typeof RadixAvatar.Root>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Root
    ref={ref}
    className={avatarStyles().root({ className })}
    {...props}
  />
));

export const AvatarImage = forwardRef<
  ElementRef<typeof RadixAvatar.Image>,
  ComponentPropsWithoutRef<typeof RadixAvatar.Image>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Image
    ref={ref}
    className={avatarStyles().image({ className })}
    {...props}
  />
));

export const AvatarFallback = forwardRef<
  ElementRef<typeof RadixAvatar.Fallback>,
  ComponentPropsWithoutRef<typeof RadixAvatar.Fallback>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Fallback
    ref={ref}
    className={avatarStyles().fallback({ className })}
    {...props}
  />
));
