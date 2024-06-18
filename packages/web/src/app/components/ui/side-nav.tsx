import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { useRouterState } from "@tanstack/react-router";

import { linkStyles } from "~/shared/styles/components/side-nav";

import type { ComponentProps } from "react";

export function SideNav() {
  return (
    <nav className="text-muted-foreground grid text-sm">
      <Link href="/settings">General</Link>
      <Link href="/settings/papercut">PaperCut</Link>
    </nav>
  );
}

type LinkProps = ComponentProps<typeof AriaLink>;
function Link(props: LinkProps) {
  const { href } = useRouterState({
    select: (state) => state.location,
  });

  const isActive = props.href === href;

  return (
    <AriaLink
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        linkStyles({ ...renderProps, isActive, className }),
      )}
    />
  );
}
