import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, LockOpen } from "lucide-react";
import { useSubscribe } from "replicache-react";

import { Button } from "~/app/components/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import { Label } from "~/app/components/ui/primitives/field";
import { Input } from "~/app/components/ui/primitives/input";
import {
  Select,
  SelectCollection,
  SelectContent,
  SelectItem,
  SelectPopover,
} from "~/app/components/ui/primitives/select";
import { useReplicache } from "~/app/lib/hooks/replicache";

import type { Organization, OrgStatus } from "@paperwait/core/organization";

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
      {org && (
        <>
          <OrganizationCard {...org} />

          <DangerZoneCard {...org} />
        </>
      )}
    </div>
  );
}

function OrganizationCard(org: Organization) {
  const [isLocked, setIsLocked] = useState(true);

  const [names, setNames] = useState(() => ({
    full: org.name,
    short: org.slug,
  }));

  const replicache = useReplicache();

  async function mutateName() {
    const name = names.full.trim();
    if (name === org.name) return;

    await replicache.mutate.updateOrganization({
      id: org.id,
      name,
      updatedAt: new Date().toISOString(),
    });
  }

  async function mutateSlug() {
    const slug = names.short.trim();
    if (slug === org.slug) return;

    await replicache.mutate.updateOrganization({
      id: org.id,
      slug,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row justify-between gap-4 space-y-0">
        <div className="flex flex-col space-y-1.5">
          <CardTitle>Organization</CardTitle>

          <CardDescription>
            Edit your organization's full and short names. The short name must
            be globally unique.
          </CardDescription>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onPress={() => setIsLocked((isLocked) => !isLocked)}
        >
          {isLocked ? (
            <Lock className="size-5" />
          ) : (
            <LockOpen className="size-5" />
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <AriaTextField>
          <Label>Full Name</Label>

          <Input
            disabled={isLocked}
            value={names.full}
            onChange={(e) =>
              setNames((names) => ({ ...names, full: e.target.value }))
            }
            onBlur={mutateName}
          />
        </AriaTextField>

        <AriaTextField>
          <Label>Short Name</Label>

          <Input
            disabled={isLocked}
            value={names.short}
            onChange={(e) =>
              setNames((names) => ({ ...names, short: e.target.value }))
            }
            onBlur={mutateSlug}
          />
        </AriaTextField>
      </CardContent>
    </Card>
  );
}

function DangerZoneCard(org: Organization) {
  const replicache = useReplicache();

  async function mutateStatus(status: Exclude<OrgStatus, "initializing">) {
    if (status === org.status) return;

    await replicache.mutate.updateOrganization({
      id: org.id,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex justify-between">
          <div>
            <Label aria-label="status">Status</Label>

            <CardDescription>{`This organization is currently ${org.status}.`}</CardDescription>
          </div>

          <Select
            aria-label="status"
            selectedKey={org.status}
            onSelectionChange={(selected) =>
              mutateStatus(selected as Exclude<OrgStatus, "initializing">)
            }
          >
            <Button variant="destructive">Change status</Button>

            <SelectPopover>
              <SelectContent aria-label="status">
                <SelectCollection
                  items={[{ name: "active" }, { name: "suspended" }]}
                >
                  {(item) => (
                    <SelectItem id={item.name} textValue={item.name}>
                      {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                    </SelectItem>
                  )}
                </SelectCollection>
              </SelectContent>
            </SelectPopover>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
