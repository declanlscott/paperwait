import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";
import { createFileRoute } from "@tanstack/react-router";
import { useSubscribe } from "replicache-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import { Label } from "~/app/components/ui/primitives/field";
import { Input } from "~/app/components/ui/primitives/input";
import { useReplicache } from "~/app/lib/hooks/replicache";

import type { Organization } from "@paperwait/core/organization";

export const Route = createFileRoute("/_authed/settings/")({
  component: Component,
});

function Component() {
  const replicache = useReplicache();

  const org = useSubscribe(replicache, (tx) =>
    tx
      .scan<Organization>({ prefix: "organization/" })
      .toArray()
      .then((values) => values.at(0)),
  );

  return (
    <div className="grid gap-6">
      {org && <OrganizationNamesCard {...org} />}
    </div>
  );
}

function OrganizationNamesCard(org: Organization) {
  const [state, setState] = useState(() => ({
    name: org.name,
    slug: org.slug,
  }));

  const replicache = useReplicache();

  async function mutateName() {
    const name = state.name.trim();
    if (name === org.name) return;

    await replicache.mutate.updateOrganization({
      id: org.id,
      name,
      updatedAt: new Date().toISOString(),
    });
  }

  async function mutateSlug() {
    const slug = state.slug.trim();
    if (slug === org.slug) return;

    await replicache.mutate.updateOrganization({
      id: org.id,
      slug,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Names</CardTitle>

        <CardDescription>
          Edit your organization's full and short names. The short name must be
          globally unique.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AriaTextField>
          <Label>Full Name</Label>

          <Input
            value={state.name}
            onChange={(e) =>
              setState((state) => ({ ...state, name: e.target.value }))
            }
            onBlur={mutateName}
          />
        </AriaTextField>

        <AriaTextField>
          <Label>Short Name</Label>

          <Input
            value={state.slug}
            onChange={(e) =>
              setState((state) => ({ ...state, slug: e.target.value }))
            }
            onBlur={mutateSlug}
          />
        </AriaTextField>
      </CardContent>
    </Card>
  );
}
