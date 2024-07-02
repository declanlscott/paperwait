import { tv } from "tailwind-variants";

export const avatarStyles = tv({
  base: "relative flex size-10 shrink-0 overflow-hidden rounded-full",
});
export type AvatarStyles = typeof avatarStyles;

export const avatarImageStyles = tv({
  base: "aspect-square size-full",
});
export type AvatarImageStyles = typeof avatarImageStyles;

export const avatarFallbackStyles = tv({
  base: "bg-muted flex size-full items-center justify-center rounded-full",
});
export type AvatarFallbackStyles = typeof avatarFallbackStyles;
