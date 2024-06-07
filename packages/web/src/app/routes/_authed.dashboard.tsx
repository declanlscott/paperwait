import { createFileRoute } from "@tanstack/react-router";
import { useSubscribe } from "replicache-react";

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
import { useReplicache } from "~/app/lib/hooks/replicache";
import { useResource } from "~/app/lib/hooks/resource";

export const Route = createFileRoute("/_authed/dashboard")({
  component: Component,
});

const frameworks = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
];

function Component() {
  const resource = useResource();
  const replicache = useReplicache();

  const users = useSubscribe(replicache, async (tx) =>
    tx.scan({ prefix: "user/" }).toArray(),
  );

  console.log({ users });

  return (
    <>
      <p className="text-red-500">Hello /dashboard!</p>
      <p>{resource.ReplicacheLicenseKey.value} from context!</p>

      <div className="flex">
        <Combobox aria-label="Select Framework">
          <ComboboxInput placeholder="Select a framework..." />
          <ComboboxPopover>
            <ComboboxListBox>
              <ComboboxSection>
                <ComboboxLabel separator>Frameworks</ComboboxLabel>
                <ComboboxCollection items={frameworks}>
                  {(item) => (
                    <ComboboxItem
                      textValue={item.label}
                      id={item.value}
                      key={item.value}
                    >
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxSection>
            </ComboboxListBox>
          </ComboboxPopover>
        </Combobox>
      </div>
    </>
  );
}
