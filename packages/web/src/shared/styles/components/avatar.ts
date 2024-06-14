import { tv } from "tailwind-variants";

export const avatarStyles = tv({
  base: "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
});
export type AvatarStyles = typeof avatarStyles;

export const avatarImageStyles = tv({
  base: "aspect-square h-full w-full",
});
export type AvatarImageStyles = typeof avatarImageStyles;

export const avatarFallbackStyles = tv({
  base: "bg-muted flex h-full w-full items-center justify-center rounded-full",
});
export type AvatarFallbackStyles = typeof avatarFallbackStyles;
