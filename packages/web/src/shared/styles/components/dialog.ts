import { tv } from "tailwind-variants";

import type { VariantProps } from "tailwind-variants";

export const dialogOverlayStyles = tv({
  base: "fixed inset-0 z-50 bg-black/80",
  variants: {
    isEntering: {
      true: "animate-in fade-in-0",
    },
    isExiting: {
      true: "animate-out fade-out-0 duration-300",
    },
  },
});
export type DialogOverlayStyles = VariantProps<typeof dialogOverlayStyles>;

export const sheetStyles = tv({
  base: "fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out h-full p-6",
  variants: {
    isEntering: {
      true: "duration-500 animate-in",
    },
    isExiting: {
      true: "duration-300 animate-out",
    },
    side: {
      top: "inset-x-0 top-0 border-b",
      bottom: "inset-x-0 bottom-0 border-t",
      left: "inset-y-0 left-0 w-3/4 border-r sm:max-w-sm",
      right: "inset-y-0 right-0 w-3/4 border-l sm:max-w-sm",
    },
  },
  compoundVariants: [
    {
      isEntering: true,
      side: "top",
      className: "slide-in-from-top",
    },
    {
      isExiting: true,
      side: "top",
      className: "slide-out-to-top",
    },
    {
      isEntering: true,
      side: "bottom",
      className: "slide-in-from-bottom",
    },
    {
      isExiting: true,
      side: "bottom",
      className: "slide-out-to-bottom",
    },
    {
      isEntering: true,
      side: "left",
      className: "slide-in-from-left",
    },
    {
      isExiting: true,
      side: "left",
      className: "slide-out-to-left",
    },
    {
      isEntering: true,
      side: "right",
      className: "slide-in-from-right",
    },
    {
      isExiting: true,
      side: "right",
      className: "slide-out-to-right",
    },
  ],
});
export type SheetStyles = VariantProps<typeof sheetStyles>;

export const dialogContentStyles = tv({
  base: "bg-background fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border p-6 shadow-lg duration-200 sm:rounded-lg md:w-full",
  variants: {
    isEntering: {
      true: "animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%]",
    },
    isExiting: {
      true: "animate-out fade-out-0 zoom-out-95 slide-out-to-left-1/2 slide-out-to-top-[48%] duration-300",
    },
  },
});
export type DialogContentStyles = VariantProps<typeof dialogContentStyles>;

export const dialogStyles = tv({
  base: "h-full outline-none",
  variants: {
    side: {
      true: "grid h-full gap-4",
    },
  },
});
export type DialogStyles = VariantProps<typeof dialogStyles>;

export const closeButtonStyles = tv({
  base: "ring-offset-background absolute right-4 top-4 rounded-sm opacity-70 transition-opacity",
  variants: {
    isFocused: {
      true: "ring-ring outline-none ring-2 ring-offset-2",
    },
    isFocusVisible: {
      true: "ring-ring outline-none ring-2 ring-offset-2",
    },
    isEntering: {
      true: "bg-accent text-muted-foreground",
    },
    isHovered: {
      true: "opacity-100",
    },
    isDisabled: {
      true: "pointer-events-none",
    },
  },
});
export type CloseButtonStyles = VariantProps<typeof closeButtonStyles>;

export const dialogHeaderStyles = tv({
  base: "flex flex-col space-y-1.5 text-center sm:text-left",
});
export type DialogHeaderStyles = VariantProps<typeof dialogHeaderStyles>;

export const dialogFooterStyles = tv({
  base: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
});
export type DialogFooterStyles = VariantProps<typeof dialogFooterStyles>;

export const dialogTitleStyles = tv({
  base: "text-lg font-semibold leading-none tracking-tight",
});
export type DialogTitleStyles = VariantProps<typeof dialogTitleStyles>;
