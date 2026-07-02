export type AuthProvider = "github" | "google";

export type AuthProviderAvailability = Record<AuthProvider, boolean>;

export type SupabaseAuthSettings = {
  external?: Partial<Record<AuthProvider, boolean>>;
};

export const defaultAuthProviderAvailability: AuthProviderAvailability = {
  github: false,
  google: false
};

export function providerAvailabilityFromSettings(
  settings: SupabaseAuthSettings | undefined
): AuthProviderAvailability {
  return {
    github: settings?.external?.github === true,
    google: settings?.external?.google === true
  };
}

export function providerSetupLabel(provider: AuthProvider): string {
  return provider === "google" ? "Google setup needed" : "GitHub setup needed";
}

export function providerButtonLabel(provider: AuthProvider, enabled: boolean): string {
  if (!enabled) {
    return providerSetupLabel(provider);
  }

  return provider === "google" ? "Continue with Google" : "Continue with GitHub";
}
