import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { getUserInitials } from "@paperwait/core/utils";
import { useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai/react";
import { LogOut } from "lucide-react";
import { useSubscribe } from "replicache-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/app/components/ui/primitives/avatar";
import { Button } from "~/app/components/ui/primitives/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxListBox,
  ComboboxPopover,
  ComboboxSection,
} from "~/app/components/ui/primitives/combobox";
import {
  Menu,
  MenuHeader,
  MenuItem,
  MenuPopover,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
} from "~/app/components/ui/primitives/menu";
import { Separator } from "~/app/components/ui/primitives/separator";
import { selectedRoomIdAtom } from "~/app/lib/atoms";
import { useAuthed, useLogout } from "~/app/lib/hooks/auth";
import { useReplicache } from "~/app/lib/hooks/replicache";
import { useSlot } from "~/app/lib/hooks/slot";
import { linkStyles } from "~/shared/styles/components/main-nav";

import type { ComponentProps } from "react";
import type { Room } from "@paperwait/core/room";

export function MainNav() {
  const { logo } = useSlot();

  const logout = useLogout();

  const replicache = useReplicache();

  const rooms = useSubscribe(replicache, async (tx) =>
    tx.scan<Room>({ prefix: "room/" }).toArray(),
  );

  const [selectedRoomId, setSelectedRoomId] = useAtom(selectedRoomIdAtom);

  const { user } = useAuthed();

  return (
    <div className="hidden flex-col md:flex">
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-4">
          <nav className="flex items-center space-x-4 lg:space-x-6">
            <a
              href="/"
              className="focus:ring-ring flex h-11 w-9 items-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              {logo}
            </a>

            <Separator orientation="vertical" className="h-8" />

            <div className="flex">
              <Combobox
                aria-label="Select Room"
                onSelectionChange={setSelectedRoomId}
                defaultSelectedKey={selectedRoomId ?? undefined}
              >
                <ComboboxInput
                  placeholder="Select a room..."
                  className="w-32"
                />

                <ComboboxPopover>
                  <ComboboxListBox>
                    <ComboboxSection>
                      <ComboboxLabel separator>Rooms</ComboboxLabel>

                      <ComboboxCollection items={rooms}>
                        {(room) => (
                          <ComboboxItem
                            textValue={room.name}
                            id={room.id}
                            key={room.id}
                          >
                            {room.name}
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxSection>
                  </ComboboxListBox>
                </ComboboxPopover>
              </Combobox>
            </div>

            <ul className="flex items-center">
              <li>
                <Link href="/dashboard">Dashboard</Link>
              </li>

              <li>
                <Link href="/settings">Settings</Link>
              </li>
            </ul>
          </nav>

          <MenuTrigger>
            <Button className="rounded-full px-0">
              <Avatar>
                <AvatarImage src={`/api/user/${user.id}/photo`} />

                <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
              </Avatar>
            </Button>

            <MenuPopover placement="bottom" className="min-w-[8rem]">
              <Menu className="w-56">
                <MenuSection>
                  <MenuHeader>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-medium leading-none">
                        {user.name}
                      </span>

                      <span className="text-muted-foreground text-xs leading-none">
                        {user.email}
                      </span>
                    </div>
                  </MenuHeader>
                </MenuSection>

                <MenuSeparator />

                <MenuSection>
                  <MenuItem onAction={logout}>
                    <LogOut className="mr-2 h-4 w-4" />

                    <span>Logout</span>
                  </MenuItem>
                </MenuSection>
              </Menu>
            </MenuPopover>
          </MenuTrigger>
        </div>
      </div>
    </div>
  );
}

export type LinkProps = ComponentProps<typeof AriaLink>;
export function Link(props: LinkProps) {
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
