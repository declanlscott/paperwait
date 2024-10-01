import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";
import { tenantStatuses } from "@paperwait/core/tenants/shared";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Lock, LockOpen, Pencil, UserRoundX } from "lucide-react";

import { DeleteUserDialog } from "~/app/components/ui/delete-user-dialog";
import { EnforceRbac } from "~/app/components/ui/enforce-rbac";
import { Button } from "~/app/components/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "~/app/components/ui/primitives/dialog";
import { Label } from "~/app/components/ui/primitives/field";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
} from "~/app/components/ui/primitives/select";
import { Input } from "~/app/components/ui/primitives/text-field";
import { Toggle } from "~/app/components/ui/primitives/toggle";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";
import { collectionItem, onSelectionChange } from "~/app/lib/ui";
import { labelStyles } from "~/styles/components/primitives/field";

import type { TenantStatus } from "@paperwait/core/tenants/shared";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: Component,
});

const authenticatedRouteApi = getRouteApi("/_authenticated");

function Component() {
  return (
    <div className="grid gap-6">
      <EnforceRbac roles={["administrator"]}>
        <OrganizationCard />
      </EnforceRbac>

      <DangerZoneCard />
    </div>
  );
}

function OrganizationCard() {
  const { initialTenant } = authenticatedRouteApi.useLoaderData();

  const tenant = useQuery(queryFactory.tenant(), {
    defaultData: initialTenant,
  });

  const [isLocked, setIsLocked] = useState(() => true);

  const [fullName, setFullName] = useState(() => tenant?.name);
  const [shortName, setShortName] = useState(() => tenant?.slug);

  const { updateTenant } = useMutator();

  async function mutateName() {
    if (tenant && fullName) {
      const name = fullName.trim();
      if (name === tenant.name) return;

      await updateTenant({
        id: tenant.id,
        name: fullName,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async function mutateSlug() {
    if (tenant && shortName) {
      const slug = shortName.trim();
      if (slug === tenant.slug) return;

      await updateTenant({
        id: tenant.id,
        slug,
        updatedAt: new Date().toISOString(),
      });
    }
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

        <Toggle onPress={() => setIsLocked((isLocked) => !isLocked)}>
          {({ isHovered }) =>
            isLocked ? (
              isHovered ? (
                <LockOpen className="size-5" />
              ) : (
                <Lock className="size-5" />
              )
            ) : isHovered ? (
              <Lock className="size-5" />
            ) : (
              <LockOpen className="size-5" />
            )
          }
        </Toggle>
      </CardHeader>

      <CardContent className="space-y-4">
        <AriaTextField>
          <Label>Full Name</Label>

          <Input
            disabled={isLocked}
            value={fullName ?? ""}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={mutateName}
          />
        </AriaTextField>

        <AriaTextField>
          <Label>Short Name</Label>

          <Input
            disabled={isLocked}
            value={shortName ?? ""}
            onChange={(e) => setShortName(e.target.value)}
            onBlur={mutateSlug}
          />
        </AriaTextField>
      </CardContent>
    </Card>
  );
}

function DangerZoneCard() {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6">
        <DeleteAccount />

        <EnforceRbac roles={["administrator"]}>
          <TenantStatusSelect />
        </EnforceRbac>
      </CardContent>
    </Card>
  );
}

function DeleteAccount() {
  const { user } = useAuthenticated();

  return (
    <div className="flex justify-between gap-4">
      <div>
        <span className={labelStyles()}>Delete User Account</span>

        <CardDescription>Delete your user account.</CardDescription>
      </div>

      <DialogTrigger>
        <Button variant="destructive">
          <UserRoundX className="mr-2 size-5" />
          Delete Account
        </Button>

        <DeleteUserDialog userId={user.id} />
      </DialogTrigger>
    </div>
  );
}

function TenantStatusSelect() {
  const { initialTenant } = authenticatedRouteApi.useLoaderData();

  const tenant = useQuery(queryFactory.tenant(), {
    defaultData: initialTenant,
  });

  const { updateTenant } = useMutator();

  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(
    () => false,
  );

  const [confirmationText, setConfirmationText] = useState(() => "");

  const isConfirmed = confirmationText === tenant?.name;

  async function mutate(status: TenantStatus) {
    if (tenant) {
      if (status === "initializing") return;
      if (status === tenant.status) return;

      await updateTenant({
        id: tenant.id,
        status,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <div className="flex justify-between gap-4">
      <div>
        <span className={labelStyles()}>Status</span>

        <CardDescription>{`This organization is currently "${tenant?.status ?? ""}".`}</CardDescription>
      </div>

      <Select
        aria-label="status"
        selectedKey={tenant?.status}
        onSelectionChange={onSelectionChange(tenantStatuses, (status) => {
          if (status === "active") return mutate("active");

          if (status === "suspended" && tenant?.status !== "suspended")
            return setIsConfirmationDialogOpen(true);
        })}
      >
        <Button variant="destructive">
          <Pencil className="mr-2 size-5" />
          Change Status
        </Button>

        <SelectPopover>
          <SelectListBox
            items={tenantStatuses
              .filter((status) => status !== "initializing")
              .map(collectionItem)}
          >
            {(item) => (
              <SelectItem
                id={item.name}
                textValue={item.name}
                className="capitalize"
              >
                {item.name}
              </SelectItem>
            )}
          </SelectListBox>
        </SelectPopover>
      </Select>

      <DialogOverlay
        isDismissable={false}
        isOpen={isConfirmationDialogOpen}
        onOpenChange={setIsConfirmationDialogOpen}
      >
        <DialogContent role="alertdialog">
          {({ close }) => (
            <>
              <DialogHeader>
                <DialogTitle>Suspend "{tenant?.name}"?</DialogTitle>

                <p className="text-muted-foreground text-sm">
                  Are you sure you want to continue? This action may be
                  disruptive for your users.
                </p>

                <p className="text-muted-foreground text-sm">
                  To confirm suspending, enter the full name of your
                  organization in the text field below.
                </p>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <AriaTextField>
                  <Label>Full Name</Label>

                  <Input
                    placeholder={tenant?.name}
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                  />
                </AriaTextField>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  autoFocus
                  onPress={() => {
                    close();
                    setConfirmationText("");
                  }}
                >
                  Cancel
                </Button>

                <Button
                  onPress={() =>
                    mutate("suspended").then(() => {
                      close();
                      setConfirmationText("");
                    })
                  }
                  isDisabled={!isConfirmed}
                >
                  Suspend
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </DialogOverlay>
    </div>
  );
}
