import {
  Blocks,
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

const productsSettingsLink = {
  name: "Products",
  props: { href: { to: "/settings/products" } },
  icon: <Package />,
} satisfies AppLink;

const imagesSettingsLink = {
  name: "Images",
  props: { href: { to: "/settings/images" } },
  icon: <Image />,
} satisfies AppLink;

export const links = {
  mainNav: {
    administrator: [dashboardLink, usersLink, settingsLink],
    operator: [dashboardLink, usersLink, settingsLink],
    manager: [dashboardLink, usersLink, settingsLink],
    customer: [dashboardLink, usersLink, settingsLink],
  },
  settings: {
    administrator: [
      generalSettingsLink,
      integrationsSettingsLink,
      productsSettingsLink,
      imagesSettingsLink,
    ],
    operator: [generalSettingsLink, productsSettingsLink, imagesSettingsLink],
    manager: [generalSettingsLink],
    customer: [generalSettingsLink],
  },
} satisfies Record<string, Record<UserRole, Array<AppLink>>>;
