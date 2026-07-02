# Global Leaderboard Plan

The leaderboard must be opt-in and aggregate-only. It should reward awareness and reduction, not shame users or expose sensitive work habits.

## User Flow

1. User clicks `Sign in` in the extension or popup.
2. The extension opens `https://app.aiwatermeter.com/auth/extension/start`.
3. The hosted app completes OAuth and links the extension device.
4. User explicitly enables sync.
5. User explicitly opts into leaderboard visibility and chooses a display name.
6. The extension uploads daily aggregate estimates, never raw prompts or responses.

## Public Leaderboard Fields

Safe public fields:

- Rank.
- Display name.
- Country or region only if the user opts in.
- Weekly awareness score.
- Estimated water saved versus selected baseline.
- Badge, such as `7-day tracker`.
- Confidence label.

Do not publish:

- Raw usage totals by default.
- Prompt counts.
- Sites used.
- Model/provider labels.
- Timestamps.
- Full country/IP/device metadata.
- Any prompt or response text.

## Backend Tables

- `users`: account profile and deletion state.
- `devices`: extension install records and rotating token hashes.
- `estimate_methods`: versioned source-backed coefficients.
- `usage_daily`: aggregate daily uploaded estimates.
- `leaderboard_profiles`: opt-in display name and visibility settings.
- `leaderboard_entries`: materialized weekly/monthly ranks.
- `abuse_flags`: rate-limit and anomaly review records.

## Abuse Controls

- Server computes scores from aggregate uploads.
- Uploads use idempotency keys and device sequence numbers.
- Rate limit per account, device, and IP range.
- Cap impossible token and prompt volumes.
- Delay public rank publication.
- Flag suspicious device churn or scripted bursts.
- Allow unranked mode and user deletion.

## Product Position

The leaderboard should say `estimated`, `source-backed`, and `confidence: low/medium/high`. It must not claim a global exact water ranking because the extension does not receive provider telemetry.
