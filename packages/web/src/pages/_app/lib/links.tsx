import {
  Blocks,
  Home,
  Image,
  LayoutDashboard,
  Package,
  Settings,
  Users,
} from "lucide-react";

import type { UserRole } from "@paperwait/core/user";
import type { AppLink } from "~/app/types";

const dashboardLink = {
  name: "Dashboard",
  props: { href: { to: "/dashboard" } },
  icon: <LayoutDashboard />,
} satisfies AppLink;

const productsLinks = {
  name: "Products",
  props: { href: { to: "/products" } },
  icon: <Package />,
} satisfies AppLink;

const usersLink = {
  name: "Users",
  props: { href: { to: "/users" } },
  icon: <Users />,
} satisfies AppLink;

const settingsLink = {
  name: "Settings",
  props: { href: { to: "/settings" } },
  icon: <Settings />,
} satisfies AppLink;

const generalSettingsLink = {
  name: "General",
  props: { href: { to: "/settings" } },
  icon: <Settings />,
} satisfies AppLink;

const integrationsSettingsLink = {
  name: "Integrations",
  props: { href: { to: "/settings/integrations" } },
  icon: <Blocks />,
} satisfies AppLink;

const roomsSettingsLink = {
  name: "Rooms",
  props: { href: { to: "/settings/rooms" } },
  icon: <Home />,
} satisfies AppLink;

const imagesSettingsLink = {
  name: "Images",
  props: { href: { to: "/settings/images" } },
  icon: <Image />,
} satisfies AppLink;

export const links = {
  mainNav: {
    administrator: [dashboardLink, productsLinks, usersLink, settingsLink],
    operator: [dashboardLink, productsLinks, usersLink, settingsLink],
    manager: [dashboardLink, productsLinks, usersLink, settingsLink],
    customer: [dashboardLink, productsLinks, usersLink, settingsLink],
  },
  settings: {
    administrator: [
      generalSettingsLink,
      integrationsSettingsLink,
      roomsSettingsLink,
      imagesSettingsLink,
    ],
    operator: [generalSettingsLink, roomsSettingsLink, imagesSettingsLink],
    manager: [generalSettingsLink],
    customer: [generalSettingsLink],
  },
} satisfies Record<string, Record<UserRole, Array<AppLink>>>;
