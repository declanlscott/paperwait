import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { useRouter, useRouterState } from "@tanstack/react-router";

import { linkStyles } from "~/shared/styles/components/side-nav";

import type { ComponentProps } from "react";

export type SideNavProps = {
  links: Array<{
    name: string;
    props: LinkProps;
  }>;
};
export function SideNav(props: SideNavProps) {
  return (
    <nav className="text-muted-foreground grid text-sm">
      {props.links.map((link) => (
        <Link key={link.name} {...link.props}>
          {link.name}
        </Link>
      ))}
    </nav>
  );
}

type LinkProps = ComponentProps<typeof AriaLink>;
function Link(props: LinkProps) {
  const { href } = useRouterState({
    select: (state) => state.location,
  });

  const { buildLocation } = useRouter();

  const isActive = href.endsWith(
    props.href ? buildLocation(props.href).href : "",
  );

  return (
    <AriaLink
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        linkStyles({ ...renderProps, isActive, className }),
      )}
    />
  );
}
