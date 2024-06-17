import { useCallback, useContext, useEffect } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";
import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ArrowRight, Cuboid, LogOut } from "lucide-react";
import { useSubscribe } from "replicache-react";

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
import {
  commandBarInputAtom,
  commandBarPagesAtom,
  selectedRoomIdAtom,
} from "~/app/lib/atoms";
import { useAuthActions } from "~/app/lib/hooks/auth";
import { useReplicache } from "~/app/lib/hooks/replicache";

import type { Room } from "@paperwait/core/room";
import type {
  RegisteredRouter,
  RoutePaths,
  ToPathOption,
} from "@tanstack/react-router";

export function CommandBar() {
  const state = useContext(OverlayTriggerStateContext);

  const [input, setInput] = useAtom(commandBarInputAtom);

  const [pages, setPages] = useAtom(commandBarPagesAtom);

  const activePage = pages[pages.length - 1];
  const isHome = activePage === "home";

  const popPage = useCallback(
    () => setPages((pages) => pages.toSpliced(-1, 1)),
    [setPages],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();

        state.toggle();
      }
    };

    document.addEventListener("keydown", down);

    return () => document.removeEventListener("keydown", down);
  }, [state, setPages]);

  function placeholder() {
    switch (activePage) {
      case "rooms":
        return "Search rooms...";
      default:
        return "Type a command or search...";
    }
  }

  return (
    <DialogOverlay>
      <CommandDialog
        commandProps={{
          onKeyDown(e) {
            if (isHome || input.length) return;

            if (e.key === "Backspace") {
              e.preventDefault();

              popPage();
            }
          },
        }}
      >
        <CommandInput
          placeholder={placeholder()}
          autoFocus
          value={input}
          onValueChange={setInput}
          back={!isHome}
        />

        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {isHome && <HomeList />}
          {activePage === "rooms" && <RoomsList />}
        </CommandList>
      </CommandDialog>
    </DialogOverlay>
  );
}

function HomeList() {
  const state = useContext(OverlayTriggerStateContext);

  const navigate = useNavigate();

  const { logout } = useAuthActions();

  const [, setInput] = useAtom(commandBarInputAtom);
  const [, setPages] = useAtom(commandBarPagesAtom);

  const handleNavigation = async (
    to: ToPathOption<
      RegisteredRouter,
      RoutePaths<RegisteredRouter["routeTree"]>,
      ""
    >,
  ) => navigate({ to }).then(() => state.close());

  return (
    <>
      <CommandGroup heading="Rooms">
        <CommandItem
          onSelect={() => {
            setPages((pages) => [...pages, "rooms"]);
            setInput("");
          }}
        >
          <Cuboid className="mr-2 size-4" />

          <span>Search rooms...</span>
        </CommandItem>
      </CommandGroup>

      <CommandGroup heading="Navigation">
        <CommandItem onSelect={() => handleNavigation("/dashboard")}>
          <ArrowRight className="mr-2 size-4" />

          <p>
            Go to <span className="font-medium">Dashboard</span>
          </p>
        </CommandItem>

        <CommandItem onSelect={() => handleNavigation("/settings")}>
          <ArrowRight className="mr-2 size-4" />

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
    </>
  );
}

function RoomsList() {
  const state = useContext(OverlayTriggerStateContext);

  const replicache = useReplicache();

  const rooms = useSubscribe(replicache, async (tx) =>
    tx.scan<Room>({ prefix: "room/" }).toArray(),
  );

  const [, setSelectedRoomId] = useAtom(selectedRoomIdAtom);

  return (
    <>
      <CommandGroup heading="Rooms">
        {rooms?.map((room) => (
          <CommandItem
            key={room.id}
            onSelect={() => {
              setSelectedRoomId(room.id);

              state.close();
            }}
          >
            <Cuboid className="mr-2 size-4" />

            <span>{room.name}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}
