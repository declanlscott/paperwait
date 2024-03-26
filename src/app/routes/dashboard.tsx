import stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: () => <Component />,
});

function Component() {
  return (
    <>
      <p {...stylex.props([styles.text])}>Hello /dashboard!</p>
    </>
  );
}

const styles = stylex.create({
  text: {
    color: "red",
  },
});
