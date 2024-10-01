import type { Registration } from "@paperwait/core/tenants/shared";

type Errors = Partial<Record<keyof Registration, Array<string>>>;

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
