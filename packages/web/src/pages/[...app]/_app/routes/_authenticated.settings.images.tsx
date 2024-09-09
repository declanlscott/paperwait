import { useState } from "react";
import { ASSETS_MIME_TYPES } from "@paperwait/core/constants";
import { createFileRoute } from "@tanstack/react-router";

import { Dropzone } from "~/app/components/ui/primitives/dropzone";

export const Route = createFileRoute("/_authenticated/settings/images")({
  component: Component,
});

function Component() {
  const [files, setFiles] = useState<Array<string>>([]);

  return (
    <Dropzone
      onDrop={async (e) => {
        const items = await Promise.all(
          e.items
            .filter((item) => item.kind === "file")
            .filter((item) => {
              const isImage = ASSETS_MIME_TYPES.includes(item.type);
              if (!isImage) {
                //
              }

              return isImage;
            })
            .map(async (item) => {
              const file = await item.getFile();

              setFiles((files) => [...files, URL.createObjectURL(file)]);
            }),
        );
      }}
    ></Dropzone>
  );
}
