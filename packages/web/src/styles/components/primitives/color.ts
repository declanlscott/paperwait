import { tv } from "tailwind-variants";

import { focusRing } from "~/styles/utils";

import type { VariantProps } from "tailwind-variants";

export const colorStyles = tv({
  slots: {
    area: "border-border size-[192px] shrink-0 rounded-md border shadow-md",
    sliderTrack: "border-border h-7 w-[192px] rounded-md border",
    thumb:
      "z-10 box-border size-5 rounded-[50%] border-2 border-white shadow-md",
    swatchPicker: "flex flex-wrap gap-2",
    swatch: "size-8",
  },
  variants: {
    isFocusVisible: {
      true: {
        thumb: "size-6",
      },
    },
  },
});
export type ColorStyles = VariantProps<typeof colorStyles>;

export const colorSwatchPickerItemStyles = tv({
  extend: focusRing,
  base: "size-8 overflow-hidden rounded-md border-2 transition-colors",
  variants: {
    isSelected: {
      true: "border-white",
    },
    isDisabled: {
      true: "pointer-events-none opacity-50",
    },
  },
});
export type ColorSwatchPickerItemStyles = VariantProps<
  typeof colorSwatchPickerItemStyles
>;
