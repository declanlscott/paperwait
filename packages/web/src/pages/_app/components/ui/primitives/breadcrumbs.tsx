import {
  Breadcrumb as AriaBreadcrumb,
  Breadcrumbs as AriaBreadcrumbs,
  Link as AriaLink,
  composeRenderProps,
} from "react-aria-components";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import {
  breadcrumbEllipsisStyles,
  breadcrumbItemStyles,
  breadcrumbLinkStyles,
  breadcrumbPageStyles,
  breadcrumbSeparatorStyles,
  breadcrumbsStyles,
} from "~/styles/components/primitives/breadcrumbs";

import type { ComponentProps } from "react";
import type {
  BreadcrumbProps as AriaBreadcrumbProps,
  BreadcrumbsProps as AriaBreadcrumbsProps,
  LinkProps as AriaLinkProps,
} from "react-aria-components";

export type BreadcrumbsProps<T extends object> = AriaBreadcrumbsProps<T>;
export const Breadcrumbs = <T extends object>({
  className,
  ...props
}: BreadcrumbsProps<T>) => (
  <AriaBreadcrumbs className={breadcrumbsStyles({ className })} {...props} />
);

export type BreadcrumbItemProps = AriaBreadcrumbProps;
export const BreadcrumbItem = ({
  className,
  ...props
}: BreadcrumbItemProps) => (
  <AriaBreadcrumb
    className={composeRenderProps(className, (className, renderProps) =>
      breadcrumbItemStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type BreadcrumbLinkProps = AriaLinkProps;
export const BreadcrumbLink = ({ className, ...props }: AriaLinkProps) => (
  <AriaLink
    className={composeRenderProps(className, (className, renderProps) =>
      breadcrumbLinkStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type BreadcrumbSeparatorProps = ComponentProps<"span">;
export const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={breadcrumbSeparatorStyles({ className })}
    {...props}
  >
    {children ?? <ChevronRight />}
  </span>
);

export type BreadcrumbEllipsisProps = ComponentProps<"span">;
export const BreadcrumbEllipsis = ({
  className,
  ...props
}: BreadcrumbEllipsisProps) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={breadcrumbEllipsisStyles({ className })}
    {...props}
  >
    <MoreHorizontal className="size-4" />

    <span className="sr-only">More</span>
  </span>
);

export type BreadcrumbPageProps = Omit<AriaLinkProps, "href">;
export const BreadcrumbPage = ({
  className,
  ...props
}: BreadcrumbPageProps) => (
  <AriaLink
    className={composeRenderProps(className, (className, renderProps) =>
      breadcrumbPageStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);
