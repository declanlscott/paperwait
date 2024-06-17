import { useContext, useEffect } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";
import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
  Book,
  BookDashed,
  Check,
  Cuboid,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import { useSubscribe } from "replicache-react";

import { Authorize } from "~/app/components/ui/authorize";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/app/components/ui/primitives/command";
import { DialogOverlay } from "~/app/components/ui/primitives/dialog";
import { selectedRoomIdAtom } from "~/app/lib/atoms";
import { useAuthActions } from "~/app/lib/hooks/auth";
import {
  useCommandBar,
  useCommandBarActions,
} from "~/app/lib/hooks/command-bar";
import { useReplicache } from "~/app/lib/hooks/replicache";

import type { Room } from "@paperwait/core/room";
import type {
  RegisteredRouter,
  RoutePaths,
  ToPathOption,
} from "@tanstack/react-router";

export function CommandBar() {
  const state = useContext(OverlayTriggerStateContext);

  const { input } = useCommandBar();
  const { getActivePage, popPage } = useCommandBarActions();
  const activePage = getActivePage();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();

        state.toggle();
      }
    };

    document.addEventListener("keydown", down);

    return () => document.removeEventListener("keydown", down);
  }, [state]);

  return (
    <DialogOverlay>
      <CommandDialog
        commandProps={{
          onKeyDown(e) {
            if (activePage.type === "home" || input.length) return;

            if (e.key === "Backspace") {
              e.preventDefault();

              popPage();
            }
          },
        }}
      >
        {activePage.type === "home" && <HomeCommand />}
        {activePage.type === "rooms" && <RoomsCommand />}
        {activePage.type === "room" && (
          <RoomCommand roomId={activePage.roomId} />
        )}
      </CommandDialog>
    </DialogOverlay>
  );
}

function HomeCommand() {
  const state = useContext(OverlayTriggerStateContext);

  const { pushPage } = useCommandBarActions();
  const { input } = useCommandBar();
  const { setInput } = useCommandBarActions();

  const navigate = useNavigate();

  const { logout } = useAuthActions();

  const handleNavigation = async (
    to: ToPathOption<
      RegisteredRouter,
      RoutePaths<RegisteredRouter["routeTree"]>,
      ""
    >,
  ) => navigate({ to }).then(() => state.close());

  return (
    <>
      <CommandInput
        placeholder="Type a command or search..."
        autoFocus
        value={input}
        onValueChange={setInput}
      />

      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Rooms">
          <CommandItem onSelect={() => pushPage({ type: "rooms" })}>
            <Cuboid className="mr-2 size-4" />

            <span>Search rooms...</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleNavigation("/dashboard")}>
            <LayoutDashboard className="mr-2 size-4" />

            <p>
              Go to <span className="font-medium">Dashboard</span>
            </p>
          </CommandItem>

          <CommandItem onSelect={() => handleNavigation("/settings")}>
            <Settings className="mr-2 size-4" />

            <p>
              Go to <span className="font-medium">Settings</span>
            </p>
          </CommandItem>

          <CommandSeparator />

          <CommandItem onSelect={() => logout()}>
            <LogOut className="mr-2 size-4" />

            <span>Logout</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </>
  );
}

function RoomsCommand() {
  const { input } = useCommandBar();
  const { setInput, pushPage, popPage } = useCommandBarActions();

  const replicache = useReplicache();

  const rooms = useSubscribe(replicache, async (tx) =>
    tx.scan<Room>({ prefix: "room/" }).toArray(),
  );

  return (
    <>
      <CommandInput
        placeholder="Search rooms..."
        autoFocus
        value={input}
        onValueChange={setInput}
        back={{ buttonProps: { onPress: () => popPage() } }}
      />

      <CommandList>
        <CommandEmpty>No rooms found.</CommandEmpty>

        <CommandGroup heading="Rooms">
          {rooms?.map((room) => (
            <CommandItem
              key={room.id}
              onSelect={() => pushPage({ type: "room", roomId: room.id })}
            >
              <Cuboid className="mr-2 size-4" />

              <span>{room.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}

type RoomCommandProps = {
  roomId: Room["id"];
};
function RoomCommand(props: RoomCommandProps) {
  const state = useContext(OverlayTriggerStateContext);

  const { input } = useCommandBar();
  const { setInput, popPage } = useCommandBarActions();

  const [, setSelectedRoomId] = useAtom(selectedRoomIdAtom);

  const replicache = useReplicache();

  const room = useSubscribe(replicache, async (tx) =>
    tx.get<Room>(`room/${props.roomId}`),
  );

  function selectRoom() {
    setSelectedRoomId(props.roomId);

    state.close();
  }

  async function updateRoomStatus(status: Room["status"]) {
    await replicache.mutate.updateRoom({
      id: props.roomId,
      status,
      updatedAt: new Date().toISOString(),
    });

    state.close();
  }

  return (
    <>
      <CommandInput
        placeholder={`Room: ${room?.name}`}
        autoFocus
        value={input}
        onValueChange={setInput}
        back={{ buttonProps: { onPress: () => popPage() } }}
      />

      <CommandList>
        <CommandEmpty>No rooms found.</CommandEmpty>

        <CommandGroup heading="Room">
          {room && (
            <>
              <CommandItem onSelect={() => selectRoom()}>
                <Check className="mr-2 size-4" />

                <p>
                  <span className="font-medium">Select</span> {room.name}
                </p>
              </CommandItem>

              <Authorize roles={["administrator", "operator"]}>
                {room.status === "draft" ? (
                  <CommandItem onSelect={() => updateRoomStatus("published")}>
                    <Book className="mr-2 size-4" />

                    <p>
                      <span className="font-medium">Publish</span> {room.name}
                    </p>
                  </CommandItem>
                ) : (
                  <CommandItem onSelect={() => updateRoomStatus("draft")}>
                    <BookDashed className="mr-2 size-4" />

                    <p>
                      <span className="font-medium">Unpublish</span> {room.name}
                    </p>
                  </CommandItem>
                )}
              </Authorize>
            </>
          )}
        </CommandGroup>
      </CommandList>
    </>
  );
}
