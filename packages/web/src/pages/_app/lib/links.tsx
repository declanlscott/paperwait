import {
  Blocks,
  Home,
  Image,
  LayoutDashboard,
  Package,
  Settings,
  Users,
} from "lucide-react";

import type { Product } from "@paperwait/core/product";
import type { Room } from "@paperwait/core/room";
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

const generalRoomSettingsLink = ((roomId: Room["id"]) => ({
  name: "General",
  props: { href: { to: "/settings/rooms/$roomId", params: { roomId } } },
  icon: <Settings />,
})) satisfies AppLink;

const productsRoomSettingsLink = ((roomId: Room["id"]) => ({
  name: "Products",
  props: {
    href: { to: "/settings/rooms/$roomId/products", params: { roomId } },
  },
  icon: <Package />,
})) satisfies AppLink;

const productSettingsLink = ((
  roomId: Room["id"],
  productId: Product["id"],
) => ({
  name: "Product",
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
      generalSettingsLink,
      integrationsSettingsLink,
      roomsSettingsLink,
      imagesSettingsLink,
    ],
    operator: [generalSettingsLink, roomsSettingsLink, imagesSettingsLink],
    manager: [generalSettingsLink],
    customer: [generalSettingsLink],
  }),
  roomSettings: (roomId: Room["id"]) => ({
    administrator: [
      generalRoomSettingsLink(roomId),
      productsRoomSettingsLink(roomId),
    ],
    operator: [
      generalRoomSettingsLink(roomId),
      productsRoomSettingsLink(roomId),
    ],
    manager: [],
    customer: [],
  }),
} satisfies AppLinksFactory;
