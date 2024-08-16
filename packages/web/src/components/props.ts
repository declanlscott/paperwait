import type { Provider } from "@paperwait/core/organization";

export type OrgProviderIdProps = {
  provider?: Provider;
};

export type OrgSlugProps = {
  value?: string;
  isValid?: boolean;
};

export type PapercutAuthTokenProps = {
  value?: string;
  show?: boolean;
};

export type PapercutHealthCheckProps =
  | { status: "initial" }
  | { status: "success" }
  | { status: "error"; reason: string };

export type AppLoadingIndicatorProps = {
  isInitial?: boolean;
};

export type LoadingIndicatorProps = {
  color?: string;
};

export type LogoProps = {
  color?: string;
};
