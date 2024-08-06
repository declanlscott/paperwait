import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const dialogStyles = tv({
  slots: {
    root: "h-full outline-none",
    overlay: "fixed inset-0 z-50 bg-muted/80",
    sheet:
      "fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out h-full p-6",
    content:
      "bg-background fixed border p-6 shadow-lg duration-200 sm:rounded-lg",
    header: "flex flex-col space-y-1.5 text-center sm:text-left",
    footer: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
    title: "text-lg font-semibold leading-none tracking-tight",
  },
  variants: {
    side: {
      top: {
        root: "grid h-full gap-4",
        sheet: "inset-x-0 top-0 border-b",
      },
      bottom: {
        root: "grid h-full gap-4",
        sheet: "inset-x-0 bottom-0 border-t",
      },
      left: {
        root: "grid h-full gap-4",
        sheet: "inset-y-0 left-0 w-3/4 border-r sm:max-w-sm",
      },
      right: {
        root: "grid h-full gap-4",
        sheet: "inset-y-0 right-0 w-3/4 border-l sm:max-w-sm",
      },
    },
    isEntering: {
      true: {
        overlay: "animate-in fade-in-0",
        sheet: "duration-500 animate-in",
        content: "animate-in fade-in-0 zoom-in-95",
      },
    },
    isExiting: {
      true: {
        overlay: "animate-out fade-out-0 duration-200",
        sheet: "duration-200 animate-out",
        content: "animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-2",
      },
    },
    position: {
      top: {
        content:
          "inset-0 z-50 mx-auto mt-[10vh] h-fit max-h-[100dvh] w-[32rem] max-w-[100vw]",
      },
      center: {
        content:
          "left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
      },
    },
  },
  compoundVariants: [
    {
      isEntering: true,
      side: "top",
      className: {
        sheet: "slide-in-from-top",
      },
    },
    {
      isExiting: true,
      side: "top",
      className: {
        sheet: "slide-out-to-top",
      },
    },
    {
      isEntering: true,
      side: "bottom",
      className: {
        sheet: "slide-in-from-bottom",
      },
    },
    {
      isExiting: true,
      side: "bottom",
      className: {
        sheet: "slide-out-to-bottom",
      },
    },
    {
      isEntering: true,
      side: "left",
      className: {
        sheet: "slide-in-from-left",
      },
    },
    {
      isExiting: true,
      side: "left",
      className: {
        sheet: "slide-out-to-left",
      },
    },
    {
      isEntering: true,
      side: "right",
      className: {
        sheet: "slide-in-from-right",
      },
    },
    {
      isExiting: true,
      side: "right",
      className: {
        sheet: "slide-out-to-right",
      },
    },
    {
      isEntering: true,
      position: "top",
      className: {
        content: "slide-in-from-bottom-2",
      },
    },
    {
      isEntering: true,
      position: "center",
      className: {
        content: "slide-in-from-left-1/2 slide-in-from-top-[48%]",
      },
    },
    {
      isExiting: true,
      position: "top",
      className: {
        content: "slide-out-to-bottom-2",
      },
    },
    {
      isExiting: true,
      position: "center",
      className: {
        content: "slide-out-to-left-1/2 slide-out-to-top-[48%]",
      },
    },
  ],
  defaultVariants: {
    position: "center",
  },
});
export type DialogStyles = VariantProps<typeof dialogStyles>;

export const closeButtonStyles = tv({
  extend: focusRing,
  base: "ring-offset-background absolute right-4 top-4 rounded-sm text-primary/50 transition-colors",
  variants: {
    isHovered: {
      true: "text-primary/100",
    },
    isDisabled: {
      true: "pointer-events-none",
    },
  },
});
export type CloseButtonStyles = VariantProps<typeof closeButtonStyles>;
