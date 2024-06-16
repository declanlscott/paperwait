import { createFileRoute } from "@tanstack/react-router";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
} from "lucide-react";

import { Button } from "~/app/components/ui/primitives/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "~/app/components/ui/primitives/command";
import {
  DialogOverlay,
  DialogTrigger,
} from "~/app/components/ui/primitives/dialog";

export const Route = createFileRoute("/_authed/dashboard")({
  component: Component,
});

function Component() {
  return (
    <>
      <p className="text-red-500">Hello /dashboard!</p>

      <DialogTrigger>
        <Button variant="outline">Command</Button>

        <DialogOverlay>
          <CommandDialog>
            <CommandInput placeholder="Type a command or search..." autoFocus />

            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>

              <CommandGroup heading="Suggestions">
                <CommandItem>
                  <Calendar className="mr-2 h-4 w-4" />

                  <span>Calendar</span>
                </CommandItem>

                <CommandItem>
                  <Smile className="mr-2 h-4 w-4" />

                  <span>Search Emoji</span>
                </CommandItem>

                <CommandItem>
                  <Calculator className="mr-2 h-4 w-4" />

                  <span>Calculator</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Settings">
                <CommandItem>
                  <User className="mr-2 h-4 w-4" />

                  <span>Profile</span>

                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>

                <CommandItem>
                  <CreditCard className="mr-2 h-4 w-4" />

                  <span>Billing</span>

                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>

                <CommandItem>
                  <Settings className="mr-2 h-4 w-4" />

                  <span>Settings</span>

                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </DialogOverlay>
      </DialogTrigger>
    </>
  );
}
