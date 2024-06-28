import { forwardRef } from "react";
import * as RadixAvatar from "@radix-ui/react-avatar";

import {
  avatarFallbackStyles,
  avatarImageStyles,
  avatarStyles,
} from "~/shared/styles/components/primitives/avatar";

import type { ComponentPropsWithoutRef, ElementRef } from "react";

export const Avatar = forwardRef<
  ElementRef<typeof RadixAvatar.Root>,
  ComponentPropsWithoutRef<typeof RadixAvatar.Root>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Root
    ref={ref}
    className={avatarStyles({ className })}
    {...props}
  />
));

export const AvatarImage = forwardRef<
  ElementRef<typeof RadixAvatar.Image>,
  ComponentPropsWithoutRef<typeof RadixAvatar.Image>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Image
    ref={ref}
    className={avatarImageStyles({ className })}
    {...props}
  />
));

export const AvatarFallback = forwardRef<
  ElementRef<typeof RadixAvatar.Fallback>,
  ComponentPropsWithoutRef<typeof RadixAvatar.Fallback>
>(({ className, ...props }, ref) => (
  <RadixAvatar.Fallback
    ref={ref}
    className={avatarFallbackStyles({ className })}
    {...props}
  />
));
