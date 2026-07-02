# Public Release Plan

Users cannot install a normal public extension without developer mode unless it is distributed through a browser store or managed by an organization. For consumer release, AI Water Meter should publish through both the Chrome Web Store and Microsoft Edge Add-ons.

## Chrome Web Store

1. Register in the Chrome Web Store Developer Dashboard.
2. Enable two-factor authentication and pay the one-time developer registration fee shown by Google during signup.
3. Build the extension zip with `npm run build`; the package is created at `release/ai-water-meter-0.1.0.zip`.
4. Upload the zip with `manifest.json` at the package root.
5. Complete store listing, privacy, distribution, screenshots, and reviewer notes.
6. Submit for review.

Chrome review can include automated and manual checks. A clear privacy policy, narrow permissions, no remote executable code, and accurate reviewer steps reduce review risk.

## Microsoft Edge Add-ons

1. Register in Microsoft Partner Center for the Edge Add-ons program.
2. Create a new extension submission.
3. Upload the same production zip after validating Edge compatibility.
4. Complete privacy, category, screenshots, listing, and availability fields.
5. Submit for Microsoft review.

Edge users can install some Chrome Web Store extensions after enabling extensions from other stores, but a native Edge Add-ons listing is the clean public path.

## CI/CD Direction

The first public submission still needs manual dashboard setup. After the store items exist:

- Use Chrome Web Store API v2 for upload and publish automation.
- Use Microsoft Edge Add-ons Update API for Edge update automation.
- Store API credentials as GitHub Actions secrets.
- Publish only from the `production` branch after `dev`, `test`, and `staging` promotion.

## Release Gates

Before public submission:

- `npm run ci` passes.
- `npm run smoke` passes on a real Chromium browser.
- `npm audit --omit=optional` has no actionable production vulnerability.
- Privacy policy matches actual permissions and data behavior.
- Store screenshots show the sidebar, popup, options methodology, and local-only disclosure.
- OAuth is absent or fully configured with stable store IDs, domains, privacy policy, and consent screen.

## Developer Mode

Loading `dist/` as an unpacked extension is only for local development and reviewer testing. Public users should install through the browser store links once approved.
