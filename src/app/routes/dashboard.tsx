import { useContext } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { SstResourceContext } from "~/app/lib/context";
import { css } from "~/styled-system/css";

export const Route = createFileRoute("/dashboard")({
  component: () => <Component />,
});

function Component() {
  const sstResource = useContext(SstResourceContext);

  return (
    <>
      <p className={css({ color: "red.500" })}>Hello /dashboard!</p>
      <p>{sstResource?.ReplicacheLicenseKey.value} from context!</p>
    </>
  );
}
