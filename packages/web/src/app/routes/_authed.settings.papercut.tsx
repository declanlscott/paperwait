import { useState } from "react";
import { useForm, valiForm } from "@modular-forms/react";
import { PapercutParameter } from "@paperwait/core/schemas";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
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
import { useApi } from "~/app/lib/hooks/api";
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
  const isConfiguring =
    useIsMutating({
      mutationKey: ["papercut", "credentials"],
    }) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>PaperCut</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex justify-between gap-4">
          <div>
            <span className={labelStyles()}>Server Credentials</span>

            <CardDescription>
              Configure the credentials to access your PaperCut server.
            </CardDescription>
          </div>

          <DialogTrigger>
            <Button isLoading={isConfiguring}>
              {isConfiguring ? "Configuring" : "Configure"}
            </Button>

            <DialogOverlay>
              <ConfigureCredentials />
            </DialogOverlay>
          </DialogTrigger>
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

  const { client } = useApi();

  const { mutate } = useMutation({
    mutationKey: ["papercut", "credentials"],
    mutationFn: (json: PapercutParameter) =>
      client.api.papercut.credentials.$put({ json }),
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
