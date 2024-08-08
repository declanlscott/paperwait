import {
  ColorArea as AriaColorArea,
  ColorField as AriaColorField,
  ColorPicker as AriaColorPicker,
  ColorSlider as AriaColorSlider,
  ColorSwatch as AriaColorSwatch,
  ColorSwatchPicker as AriaColorSwatchPicker,
  ColorSwatchPickerItem as AriaColorSwatchPickerItem,
  ColorThumb as AriaColorThumb,
  ColorWheel as AriaColorWheel,
  ColorWheelTrack as AriaColorWheelTrack,
  SliderOutput as AriaSliderOutput,
  SliderTrack as AriaSliderTrack,
  composeRenderProps,
} from "react-aria-components";

import {
  colorStyles,
  colorSwatchPickerItemStyles,
} from "~/styles/components/primitives/color";

import type {
  ColorAreaProps as AriaColorAreaProps,
  ColorSwatchPickerItemProps as AriaColorSwatchPickerItemProps,
  ColorSwatchPickerProps as AriaColorSwatchPickerProps,
  ColorSwatchProps as AriaColorSwatchProps,
  ColorThumbProps as AriaColorThumbProps,
  ColorWheelProps as AriaColorWheelProps,
  SliderTrackProps as AriaSliderTrackProps,
} from "react-aria-components";

export const ColorSlider = AriaColorSlider;

export const ColorField = AriaColorField;

export const ColorWheelTrack = AriaColorWheelTrack;

export const ColorPicker = AriaColorPicker;

export const SliderOutput = AriaSliderOutput;

export interface ColorWheelProps
  extends Omit<AriaColorWheelProps, "outerRadius" | "innerRadius"> {
  outerRadius?: number;
  innerRadius?: number;
}
export function ColorWheel({
  className,
  outerRadius = 100,
  innerRadius = 74,
  ...props
}: ColorWheelProps) {
  return (
    <AriaColorWheel
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      className={className}
      {...props}
    />
  );
}

export type ColorAreaProps = AriaColorAreaProps;
export function ColorArea({ className, ...props }: ColorAreaProps) {
  return (
    <AriaColorArea
      className={composeRenderProps(className, (className, renderProps) =>
        colorStyles().area({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}

export type SliderTrackProps = AriaSliderTrackProps;
export function SliderTrack({ className, ...props }: SliderTrackProps) {
  return (
    <AriaSliderTrack
      className={composeRenderProps(className, (className, renderProps) =>
        colorStyles().sliderTrack({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}

export type ColorThumbProps = AriaColorThumbProps;
export function ColorThumb({ className, ...props }: ColorThumbProps) {
  return (
    <AriaColorThumb
      className={composeRenderProps(className, (className, renderProps) =>
        colorStyles().thumb({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}

export type ColorSwatchPickerProps = AriaColorSwatchPickerProps;
export function ColorSwatchPicker({
  className,
  ...props
}: ColorSwatchPickerProps) {
  return (
    <AriaColorSwatchPicker
      className={composeRenderProps(className, (className, renderProps) =>
        colorStyles().swatchPicker({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}

export type ColorSwatchPickerItemProps = AriaColorSwatchPickerItemProps;
export function ColorSwatchPickerItem({
  className,
  ...props
}: ColorSwatchPickerItemProps) {
  return (
    <AriaColorSwatchPickerItem
      className={composeRenderProps(className, (className, renderProps) =>
        colorSwatchPickerItemStyles({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}

export type ColorSwatchProps = AriaColorSwatchProps;
export function ColorSwatch({ className, ...props }: ColorSwatchProps) {
  return (
    <AriaColorSwatch
      className={composeRenderProps(className, (className, renderProps) =>
        colorStyles().swatch({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}
