import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai/react";
import {
  BookDashed,
  Cuboid,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";
import { useSubscribe } from "replicache-react";

import { CommandBar } from "~/app/components/ui/command-bar";
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
import { Separator } from "~/app/components/ui/primitives/separator";
import { UserMenu } from "~/app/components/ui/user-menu";
import { selectedRoomIdAtom } from "~/app/lib/atoms";
import { useCommandBarActions } from "~/app/lib/hooks/command-bar";
import { useIsSyncing, useReplicache } from "~/app/lib/hooks/replicache";
import { useSlot } from "~/app/lib/hooks/slot";
import { linkStyles, logoStyles } from "~/shared/styles/components/main-nav";

import type { ComponentProps } from "react";
import type { Room } from "@paperwait/core/room";

export function MainNav() {
  const { logo } = useSlot();

  const isSyncing = useIsSyncing();

  return (
    <header className="bg-background sticky top-0 flex h-16 items-center justify-between border-b px-4">
      <nav className="flex items-center space-x-4 lg:space-x-6">
        <a href="/" className={logoStyles({ isAnimating: isSyncing })}>
          {logo}
        </a>

        <Separator orientation="vertical" className="h-8" />

        <RoomSelector />

        <NavList />
      </nav>

      <div className="flex gap-4">
        <SearchCommand />

        <UserMenu />
      </div>
    </header>
  );
}

function RoomSelector() {
  const replicache = useReplicache();

  const rooms = useSubscribe(replicache, async (tx) =>
    tx.scan<Room>({ prefix: "room/" }).toArray(),
  );

  const [selectedRoomId, setSelectedRoomId] = useAtom(selectedRoomIdAtom);

  return (
    <div className="hidden md:flex">
      <Combobox
        aria-label="Select Room"
        onSelectionChange={setSelectedRoomId}
        selectedKey={selectedRoomId}
      >
        <ComboboxInput
          placeholder="Select a room..."
          className="w-32"
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
  );
}

function NavList() {
  return (
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
  );
}

type LinkProps = ComponentProps<typeof AriaLink>;
function Link(props: LinkProps) {
  const { href } = useRouterState({
    select: (state) => state.location,
  });

  const isActive = href.includes(props.href ?? "");

  return (
    <AriaLink
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        linkStyles({ ...renderProps, isActive, className }),
      )}
    />
  );
}

function SearchCommand() {
  const { reset } = useCommandBarActions();

  return (
    <DialogTrigger onOpenChange={(isOpen) => isOpen && reset()}>
      <Button variant="outline" className="w-fit justify-between md:w-40">
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
  );
}
