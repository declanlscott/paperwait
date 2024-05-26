import { createFileRoute, redirect } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { fallback, parse, safeParse } from "valibot";

import { Button } from "~/app/components/button";
import { Input } from "~/app/components/input";
import { Label } from "~/app/components/label";
import { initialLoginSearchParams, loginSearchParams } from "~/app/lib/auth";
import { buttonStyles } from "~/styles/components/button";

export const Route = createFileRoute("/login")({
  validateSearch: (search) =>
    parse(fallback(loginSearchParams, initialLoginSearchParams), search),
  beforeLoad: ({ context }) => {
    if (context.authStore.user) throw redirect({ to: "/dashboard" });
  },
  component: () => <Component />,
});

function Component() {
  const search = Route.useSearch();
  const isValid = safeParse(loginSearchParams, search).success;

  const navigate = Route.useNavigate();

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="bg-muted hidden lg:block lg:max-h-screen">
        <img
          src="/placeholder.svg"
          alt="placeholder"
          width="1920"
          height="1080"
          className="h-full w-full object-cover"
        />
      </div>

      <form
        action="/api/auth/login"
        method="GET"
        className="flex items-center justify-center pb-12"
      >
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="flex justify-center">
            <a href="/">
              <img src="./logo.svg" className="size-20" />
            </a>
          </div>

          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-muted-foreground text-balance">
              Enter your organization below to login to your account.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="org">Organization</Label>
              <Input
                id="org"
                name="org"
                value={search.org}
                onChange={(e) =>
                  navigate({
                    search: {
                      ...search,
                      org: e.target.value,
                    },
                  })
                }
                required
              />

              {search.redirect && (
                <input type="hidden" name="redirect" value={search.redirect} />
              )}
            </div>

            <Button
              className="w-full gap-2"
              type="submit"
              isDisabled={!isValid}
            >
              <LogIn className="size-5" />
              Continue
            </Button>
          </div>

          <p className="text-sm">
            Don&apos;t have an organization?{" "}
            <a
              href="/register"
              className={buttonStyles({
                variant: "link",
                className: "h-fit p-0",
              })}
            >
              Register
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
