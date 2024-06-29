import { LayoutDashboard, Package, Settings, Users } from "lucide-react";

import type { UserRole } from "@paperwait/core/user";
import type { AppLink } from "~/app/types";

const dashboardLink = {
  name: "Dashboard",
  props: { href: "/dashboard" },
  icon: <LayoutDashboard />,
} satisfies AppLink;

const usersLink = {
  name: "Users",
  props: { href: "/users" },
  icon: <Users />,
} satisfies AppLink;

const productsLink = {
  name: "Products",
  props: { href: "/products" },
  icon: <Package />,
} satisfies AppLink;

const settingsLink = {
  name: "Settings",
  props: { href: "/settings" },
  icon: <Settings />,
} satisfies AppLink;

export const links = {
  mainNav: {
    administrator: [dashboardLink, usersLink, productsLink, settingsLink],
    operator: [dashboardLink, usersLink, productsLink, settingsLink],
    manager: [dashboardLink, usersLink, settingsLink],
    customer: [dashboardLink, usersLink, settingsLink],
  },
  settings: {
    administrator: [
      {
        name: "General",
        props: { href: "/settings" },
      },
      {
        name: "Integrations",
        props: { href: "/settings/integrations" },
      },
    ],
    operator: [
      {
        name: "General",
        props: { href: "/settings" },
      },
    ],
    manager: [
      {
        name: "General",
        props: { href: "/settings" },
      },
    ],
    customer: [
      {
        name: "General",
        props: { href: "/settings" },
      },
    ],
  },
} satisfies Record<string, Record<UserRole, Array<AppLink>>>;
