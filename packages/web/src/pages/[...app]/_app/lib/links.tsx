import {
  Blocks,
  DollarSign,
  Home,
  Image,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Wrench,
} from "lucide-react";

import type { Product } from "@paperwait/core/products/sql";
import type { Room } from "@paperwait/core/rooms/sql";
import type { AppLink, AppLinksFactory } from "~/app/types";

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

const settingsGeneralLink = {
  name: "General",
  props: { href: { to: "/settings" } },
  icon: <Settings />,
} satisfies AppLink;

const settingsIntegrationsLink = {
  name: "Integrations",
  props: { href: { to: "/settings/integrations" } },
  icon: <Blocks />,
} satisfies AppLink;

const roomsSettingsLink = {
  name: "Rooms",
  props: { href: { to: "/settings/rooms" } },
  icon: <Home />,
} satisfies AppLink;

const roomSettingsGeneralLink = ((roomId: Room["id"]) => ({
  name: "General",
  props: { href: { to: "/settings/rooms/$roomId", params: { roomId } } },
  icon: <Settings />,
})) satisfies AppLink;

const roomSettingsConfigurationLink = ((roomId: Room["id"]) => ({
  name: "Configuration",
  props: {
    href: { to: "/settings/rooms/$roomId/configuration", params: { roomId } },
  },
  icon: <Wrench />,
})) satisfies AppLink;

const roomSettingsProductsLink = ((roomId: Room["id"]) => ({
  name: "Products",
  props: {
    href: { to: "/settings/rooms/$roomId/products", params: { roomId } },
  },
  icon: <Package />,
})) satisfies AppLink;

const roomSettingsCostScriptsLink = ((roomId: Room["id"]) => ({
  name: "Cost Scripts",
  props: {
    href: { to: "/settings/rooms/$roomId/cost-scripts", params: { roomId } },
  },
  icon: <DollarSign />,
})) satisfies AppLink;

const productSettingsLink = ((
  roomId: Room["id"],
  productId: Product["id"],
) => ({
  name: "",
  props: {
    href: {
      to: "/settings/rooms/$roomId/products/$productId",
      params: { roomId, productId },
    },
  },
  icon: <Settings />,
})) satisfies AppLink;

const imagesSettingsLink = {
  name: "Images",
  props: { href: { to: "/settings/images" } },
  icon: <Image />,
} satisfies AppLink;

export const linksFactory = {
  mainNav: () => ({
    administrator: [dashboardLink, productsLinks, usersLink, settingsLink],
    operator: [dashboardLink, productsLinks, usersLink, settingsLink],
    manager: [dashboardLink, productsLinks, usersLink, settingsLink],
    customer: [dashboardLink, productsLinks, usersLink, settingsLink],
  }),
  settings: () => ({
    administrator: [
      settingsGeneralLink,
      settingsIntegrationsLink,
      roomsSettingsLink,
      imagesSettingsLink,
    ],
    operator: [settingsGeneralLink, roomsSettingsLink, imagesSettingsLink],
    manager: [settingsGeneralLink],
    customer: [settingsGeneralLink],
  }),
  roomSettings: (roomId: Room["id"]) => ({
    administrator: [
      roomSettingsGeneralLink(roomId),
      roomSettingsConfigurationLink(roomId),
      roomSettingsProductsLink(roomId),
      roomSettingsCostScriptsLink(roomId),
    ],
    operator: [
      roomSettingsGeneralLink(roomId),
      roomSettingsConfigurationLink(roomId),
      roomSettingsProductsLink(roomId),
      roomSettingsCostScriptsLink(roomId),
    ],
    manager: [],
    customer: [],
  }),
  productSettings: (roomId: Room["id"], productId: Product["id"]) => ({
    administrator: [productSettingsLink(roomId, productId)],
    operator: [productSettingsLink(roomId, productId)],
    manager: [],
    customer: [],
  }),
} satisfies AppLinksFactory;
