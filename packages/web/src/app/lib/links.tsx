import { LayoutDashboard, Settings, Users } from "lucide-react";

import type { UserRole } from "@paperwait/core/user";
import type { Links } from "~/app/types";

export const links = {
  mainNav: {
    administrator: [
      {
        name: "Dashboard",
        props: { href: "/dashboard" },
        icon: <LayoutDashboard />,
      },
      {
        name: "Users",
        props: { href: "/users" },
        icon: <Users />,
      },
      {
        name: "Settings",
        props: { href: "/settings" },
        icon: <Settings />,
      },
    ],
    operator: [
      {
        name: "Dashboard",
        props: { href: "/dashboard" },
        icon: <LayoutDashboard />,
      },
    ],
    manager: [
      {
        name: "Dashboard",
        props: { href: "/dashboard" },
        icon: <LayoutDashboard />,
      },
    ],
    customer: [
      {
        name: "Dashboard",
        props: { href: "/dashboard" },
        icon: <LayoutDashboard />,
      },
    ],
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
    operator: [],
    manager: [],
    customer: [],
  },
} satisfies Record<string, Record<UserRole, Links>>;
