import { useState } from "react";
import { useForm, valiForm } from "@modular-forms/react";
import { PapercutParameter } from "@paperwait/core/schemas";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, FlaskConical, RefreshCw, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { TextInput } from "~/app/components/ui/form";
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
import { useOptionsFactory } from "~/app/lib/hooks/options-factory";
import { labelStyles } from "~/shared/styles/components/primitives/field";

import type { SubmitHandler } from "@modular-forms/react";
import type * as v from "valibot";

export const Route = createFileRoute("/_authed/settings/papercut")({
  component: Component,
});

function Component() {
  return (
    <div className="grid gap-6">
      <PapercutCard />
    </div>
  );
}

function PapercutCard() {
  const options = useOptionsFactory();

  const isConfiguring =
    useIsMutating({
      mutationKey: options.mutation.papercutCredentials().mutationKey,
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
                  <Settings2 className="mr-2 size-4" />
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

          <TestConnection />
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
  const [form, { Form, Field }] = useForm<
    v.InferInput<typeof PapercutParameter>
  >({
    validate: valiForm(PapercutParameter),
  });

  const options = useOptionsFactory();

  const { mutate } = useMutation({
    ...options.mutation.papercutCredentials(),
    onSuccess: () =>
      toast.success("Successfully configured PaperCut server credentials."),
  });

  const [showAuthToken, setShowAuthToken] = useState(false);

  const handleSubmit: SubmitHandler<
    v.InferOutput<typeof PapercutParameter>
  > = async (credentials) => {
    mutate(credentials);
  };

  return (
    <DialogContent>
      {({ close }) => (
        <Form
          onSubmit={(values, event) => {
            handleSubmit(values, event);

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
            <Field name="serverUrl">
              {(field, props) => (
                <TextInput
                  {...props}
                  type="url"
                  label="XML Web Services API URL"
                  placeholder="https://[server_name]:9192/rpc/api/xmlrpc"
                  value={field.value}
                  error={field.error}
                  required
                />
              )}
            </Field>

            <div className="flex gap-2">
              <Field name="authToken">
                {(field, props) => (
                  <TextInput
                    {...props}
                    type={showAuthToken ? "text" : "password"}
                    label="Auth Token"
                    value={field.value}
                    error={field.error}
                    required
                    autoComplete="off"
                  />
                )}
              </Field>

              <Button
                variant="ghost"
                size="icon"
                onPress={() =>
                  setShowAuthToken((showAuthToken) => !showAuthToken)
                }
                className="self-end"
              >
                {showAuthToken ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onPress={close}>
              Cancel
            </Button>

            <Button type="submit" isDisabled={form.invalid.value}>
              Save
            </Button>
          </DialogFooter>
        </Form>
      )}
    </DialogContent>
  );
}

function TestConnection() {
  const options = useOptionsFactory();

  const { mutate, isPending } = useMutation({
    ...options.mutation.testConnection(),
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
          <FlaskConical className="mr-2 size-4" />
          Test
        </>
      )}
    </Button>
  );
}

function SyncAccounts() {
  const options = useOptionsFactory();

  const { mutate, isPending } = useMutation({
    ...options.mutation.syncAccounts(),
    onSuccess: () => toast.success("Successfully synced shared accounts."),
    onError: () => toast.error("Failed to sync shared accounts."),
  });

  return (
    <Button onPress={() => mutate()} isLoading={isPending}>
      {isPending ? (
        "Syncing"
      ) : (
        <>
          <RefreshCw className="mr-2 size-4" />
          Sync
        </>
      )}
    </Button>
  );
}
