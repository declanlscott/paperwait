import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { getUserInitials } from "@paperwait/core/utils";
import { useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai/react";
import {
  BookDashed,
  Building2,
  Cuboid,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
} from "lucide-react";
import { useSubscribe } from "replicache-react";

import { CommandBar } from "~/app/components/ui/command-bar";
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
import { DialogTrigger } from "~/app/components/ui/primitives/dialog";
import { KeyboardShortcut } from "~/app/components/ui/primitives/keyboard-shortcut";
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
import { useCommandBarActions } from "~/app/lib/hooks/command-bar";
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

  const { user, org } = useAuthed();

  const { reset } = useCommandBarActions();

  return (
    <div className="flex flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-4">
          <nav className="flex items-center space-x-4 lg:space-x-6">
            <a
              href="/"
              className="focus-visible:ring-ring flex h-11 w-9 items-center overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {logo}
            </a>

            <Separator orientation="vertical" className="h-8" />

            <div className="flex">
              <Combobox
                aria-label="Select Room"
                onSelectionChange={setSelectedRoomId}
                selectedKey={selectedRoomId}
              >
                <ComboboxInput
                  placeholder="Select a room..."
                  className="w-0 md:w-32"
                  icon={<Cuboid className="size-4 opacity-50" />}
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
                            <div className="flex w-full items-center justify-between">
                              {room.name}

                              {room.status === "draft" && (
                                <BookDashed className="size-4" />
                              )}
                            </div>
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
                <Link href="/dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="size-5 md:size-4" />

                  <span className="hidden md:block">Dashboard</span>
                </Link>
              </li>

              <li>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="size-5 md:size-4" />

                  <span className="hidden md:block">Settings</span>
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex gap-4">
            <DialogTrigger onOpenChange={(isOpen) => isOpen && reset()}>
              <Button
                variant="outline"
                className="w-fit justify-between md:w-40"
              >
                <div className="flex items-center">
                  <Search className="h-4 w-4 shrink-0 opacity-50 md:mr-2" />

                  <span className="text-muted-foreground hidden font-normal md:block">
                    Search...
                  </span>
                </div>

                <KeyboardShortcut>⌘K</KeyboardShortcut>
              </Button>

              <CommandBar />
            </DialogTrigger>

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
                      <div className="flex items-center gap-2">
                        <Building2 />

                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium leading-none">
                            {org.name}
                          </span>

                          <span className="text-muted-foreground text-xs leading-none">
                            {org.slug}
                          </span>
                        </div>
                      </div>
                    </MenuHeader>
                  </MenuSection>

                  <MenuSeparator />

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
                      <LogOut className="mr-2 size-4" />

                      <span>Logout</span>
                    </MenuItem>
                  </MenuSection>
                </Menu>
              </MenuPopover>
            </MenuTrigger>
          </div>
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
