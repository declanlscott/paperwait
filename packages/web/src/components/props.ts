import type { Registration } from "@paperwait/core/organizations/shared";

type Errors = {
  [Key in keyof Registration]?: Array<string>;
};

export type RegistrationStepProps = {
  input: Record<string, string | undefined>;
  errors?: Errors;
};
export type RegistrationConfirmationProps = {
  input: Registration;
};

export type AppLoadingIndicatorProps = {
  isInitial?: boolean;
};

export type LoadingIndicatorProps = {
  color?: string;
};

export type LogoProps = {
  color?: string;
};
