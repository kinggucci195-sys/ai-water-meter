import manifest from "../public/manifest.json";

describe("manifest", () => {
  it("uses MV3 with narrow default permissions", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(["storage", "alarms"]);
    expect(manifest.host_permissions).not.toContain("<all_urls>");
    expect("optional_host_permissions" in manifest).toBe(false);
  });

  it("declares required icon sizes for browser stores", () => {
    expect(Object.keys(manifest.icons)).toEqual(["16", "32", "48", "128"]);
    expect(Object.keys(manifest.action.default_icon)).toEqual(["16", "32", "48", "128"]);
  });
});
