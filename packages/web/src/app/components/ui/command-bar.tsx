import { useCallback, useContext, useEffect, useState } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/app/components/ui/primitives/command";
import { DialogOverlay } from "~/app/components/ui/primitives/dialog";

import type {
  RegisteredRouter,
  RoutePaths,
  ToPathOption,
} from "@tanstack/react-router";

export function CommandBar() {
  const state = useContext(OverlayTriggerStateContext);

  const [input, setInput] = useState("");

  const [pages, setPages] = useState(["home"]);

  const activePage = pages[pages.length - 1];
  const isHome = activePage === "home";

  const popPage = useCallback(
    () => setPages((pages) => pages.toSpliced(-1, 1)),
    [],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();

        setPages(() => ["home"]);

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
            if (isHome || input.length) return;

            if (e.key === "Backspace") {
              e.preventDefault();

              popPage();
            }
          },
        }}
      >
        <CommandInput
          placeholder="Type a command or search..."
          autoFocus
          onValueChange={setInput}
        />

        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {isHome && <HomeList />}
        </CommandList>
      </CommandDialog>
    </DialogOverlay>
  );
}

function HomeList() {
  const navigate = useNavigate();

  const state = useContext(OverlayTriggerStateContext);

  async function handleNavigate(
    to: ToPathOption<
      RegisteredRouter,
      RoutePaths<RegisteredRouter["routeTree"]>,
      ""
    >,
  ) {
    await navigate({ to });

    state.close();
  }

  return (
    <>
      <CommandGroup heading="Navigation">
        <CommandItem onSelect={() => handleNavigate("/dashboard")}>
          <ArrowRight className="mr-2 h-4 w-4" />

          <span>Dashboard</span>
        </CommandItem>

        <CommandItem onSelect={() => handleNavigate("/settings")}>
          <ArrowRight className="mr-2 h-4 w-4" />

          <span>Settings</span>
        </CommandItem>
      </CommandGroup>
    </>
  );
}
