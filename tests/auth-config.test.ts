import {
  defaultAuthProviderAvailability,
  providerAvailabilityFromSettings,
  providerButtonLabel,
  providerSetupLabel
} from "../web-app/src/auth-config";

describe("auth provider configuration", () => {
  it("treats providers as disabled until Supabase reports them enabled", () => {
    expect(providerAvailabilityFromSettings(undefined)).toEqual(defaultAuthProviderAvailability);
    expect(
      providerAvailabilityFromSettings({ external: { google: false, github: false } })
    ).toEqual(defaultAuthProviderAvailability);
  });

  it("reads Google and GitHub availability from Supabase auth settings", () => {
    expect(providerAvailabilityFromSettings({ external: { google: true, github: false } })).toEqual(
      {
        github: false,
        google: true
      }
    );
  });

  it("uses setup labels when a provider is not enabled", () => {
    expect(providerSetupLabel("google")).toBe("Google setup needed");
    expect(providerButtonLabel("google", false)).toBe("Google setup needed");
    expect(providerButtonLabel("google", true)).toBe("Continue with Google");
  });
});
