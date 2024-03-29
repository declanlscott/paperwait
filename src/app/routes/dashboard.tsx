import { useContext } from "react";
import stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";

import { SstResourceContext } from "~/app/lib/context";

export const Route = createFileRoute("/dashboard")({
  component: () => <Component />,
});

function Component() {
  const sstResource = useContext(SstResourceContext);

  return (
    <>
      <p {...stylex.props([styles.text])}>Hello /dashboard!</p>
      <p>{sstResource?.ReplicacheLicenseKey.value} from context!</p>
    </>
  );
}

const styles = stylex.create({
  text: {
    color: "red",
  },
});
