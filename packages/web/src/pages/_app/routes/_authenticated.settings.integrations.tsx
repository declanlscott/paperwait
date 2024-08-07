import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";
import { ApplicationError } from "@paperwait/core/errors";
import { PapercutParameter } from "@paperwait/core/schemas";
import { useForm } from "@tanstack/react-form";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-form-adapter";
import {
  Eye,
  EyeOff,
  FlaskConical,
  RefreshCw,
  RotateCw,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "~/app/components/ui/primitives/text-field";
import { Toggle } from "~/app/components/ui/primitives/toggle";
import { useMutationOptionsFactory } from "~/app/lib/hooks/data";
import { labelStyles } from "~/styles/components/primitives/field";

import type { ComponentProps } from "react";
import type { ErrorRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  beforeLoad: ({ context }) =>
    context.authStore.actions.authorizeRoute(context.user, ["administrator"]),
  component: Component,
  errorComponent: ErrorComponent,
});

function Component() {
  return (
    <div className="grid gap-6">
      <PapercutCard />
    </div>
  );
}

function PapercutCard() {
  const { papercutCredentials } = useMutationOptionsFactory();

  const isConfiguring =
    useIsMutating({
      mutationKey: papercutCredentials().mutationKey,
    }) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>PaperCut</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6">
        <div className="flex justify-between gap-4">
          <div>
            <span className={labelStyles()}>Server Credentials</span>

            <CardDescription>
              Configure the credentials to access your PaperCut server.
            </CardDescription>
          </div>

          <DialogTrigger>
            <Button isLoading={isConfiguring}>
              {isConfiguring ? (
                "Configuring"
              ) : (
                <>
                  <Settings2 className="mr-2 size-5" />
                  Configure
                </>
              )}
            </Button>

            <DialogOverlay>
              <ConfigureCredentials />
            </DialogOverlay>
          </DialogTrigger>
        </div>

        <div className="flex justify-between gap-4">
          <div>
            <span className={labelStyles()}>Test Connection</span>

            <CardDescription>
              Test the connection to your PaperCut server.
            </CardDescription>
          </div>

          <TestPapercutConnection />
        </div>

        <div className="flex justify-between gap-4">
          <div>
            <span className={labelStyles()}>Shared Accounts</span>

            <CardDescription>
              Sync the shared accounts from your PaperCut server.
            </CardDescription>
          </div>

          <SyncAccounts />
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigureCredentials() {
  const { papercutCredentials } = useMutationOptionsFactory();

  const { mutate } = useMutation({
    ...papercutCredentials(),
    onSuccess: () =>
      toast.success("Successfully configured PaperCut server credentials."),
  });

  const form = useForm({
    defaultValues: {
      serverUrl: "",
      authToken: "",
    } satisfies PapercutParameter,
    validatorAdapter: valibotValidator(),
    onSubmit: ({ value }) => mutate(value),
  });

  const [showAuthToken, setShowAuthToken] = useState(() => false);

  return (
    <DialogContent>
      {({ close }) => (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            await form.handleSubmit();

            close();
          }}
        >
          <DialogHeader>
            <DialogTitle>Configure Server Credentials</DialogTitle>

            <p className="text-muted-foreground text-sm">
              Configure the credentials to access your PaperCut server. These
              are encrypted and{" "}
              <strong>will not be visible after you save them</strong>.
            </p>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <form.Field
              name="serverUrl"
              validators={{
                onChange: PapercutParameter.entries.serverUrl,
              }}
            >
              {(field) => (
                <AriaTextField>
                  <Label htmlFor="serverUrl">XML Web Services API URL</Label>

                  <Input
                    id="serverUrl"
                    type="url"
                    placeholder="https://[server_name]:9192/rpc/api/xmlrpc"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </AriaTextField>
              )}
            </form.Field>

            <div className="flex gap-2">
              <form.Field
                name="authToken"
                validators={{ onChange: PapercutParameter.entries.authToken }}
              >
                {(field) => (
                  <AriaTextField className="grow">
                    <Label htmlFor="authToken">Auth Token</Label>

                    <Input
                      id="authToken"
                      type={showAuthToken ? "text" : "password"}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      autoComplete="off"
                    />
                  </AriaTextField>
                )}
              </form.Field>

              <Toggle
                onPress={() =>
                  setShowAuthToken((showAuthToken) => !showAuthToken)
                }
                className="self-end"
              >
                {showAuthToken ? (
                  <Eye className="size-5" />
                ) : (
                  <EyeOff className="size-5" />
                )}
              </Toggle>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onPress={close}>
              Cancel
            </Button>

            <form.Subscribe selector={({ canSubmit }) => canSubmit}>
              {(canSubmit) => (
                <Button type="submit" isDisabled={!canSubmit}>
                  Save
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}

function TestPapercutConnection() {
  const { testPapercutConnection } = useMutationOptionsFactory();

  const { mutate, isPending } = useMutation({
    ...testPapercutConnection(),
    onSuccess: () =>
      toast.success("Successfully connected to PaperCut server."),
    onError: () => toast.error("Failed to connect to PaperCut server."),
  });

  return (
    <Button onPress={() => mutate()} isLoading={isPending}>
      {isPending ? (
        "Testing"
      ) : (
        <>
          <FlaskConical className="mr-2 size-5" />
          Test
        </>
      )}
    </Button>
  );
}

function SyncAccounts() {
  const { syncPapercutAccounts } = useMutationOptionsFactory();

  const { mutate, isPending } = useMutation({
    ...syncPapercutAccounts(),
    onSuccess: () => toast.success("Successfully synced shared accounts."),
    onError: () => toast.error("Failed to sync shared accounts."),
  });

  return (
    <Button onPress={() => mutate()} isLoading={isPending}>
      {isPending ? (
        "Syncing"
      ) : (
        <>
          <RefreshCw className="mr-2 size-5" />
          Sync
        </>
      )}
    </Button>
  );
}

function ErrorComponent(props: ComponentProps<ErrorRouteComponent>) {
  const message =
    props.error instanceof ApplicationError
      ? props.error.message
      : "Something went wrong...";

  return (
    <Card className="border-destructive">
      <CardHeader className="flex-row justify-between gap-4 space-y-0">
        <div className="flex flex-col space-y-1.5">
          <CardTitle>Error!</CardTitle>

          <CardDescription>{message}</CardDescription>
        </div>

        <Button variant="destructive" onPress={props.reset}>
          <RotateCw className="mr-2 size-5" />
          Retry
        </Button>
      </CardHeader>
    </Card>
  );
}
