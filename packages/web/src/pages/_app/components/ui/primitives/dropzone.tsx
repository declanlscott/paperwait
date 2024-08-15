import {
  DropZone as AriaDropzone,
  composeRenderProps,
} from "react-aria-components";

import { dropzoneStyles } from "~/styles/components/primitives/dropzone";

import type { DropZoneProps as AriaDropzoneProps } from "react-aria-components";

export type DropzoneProps = AriaDropzoneProps;

export const DropZone = ({ className, ...props }: DropzoneProps) => (
  <AriaDropzone
    className={composeRenderProps(className, (className, renderProps) =>
      dropzoneStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);
