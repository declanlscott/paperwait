import { useContext } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { SstResourceContext } from "~/app/lib/context";

export const Route = createFileRoute("/dashboard")({
  component: () => <Component />,
});

function Component() {
  const sstResource = useContext(SstResourceContext);

  return (
    <>
      <p className="text-red-500">Hello /dashboard!</p>
      <p>{sstResource?.ReplicacheLicenseKey.value} from context!</p>
    </>
  );
}
