# Safari (macOS) — best-effort

> **Chrome is the primary platform.** Safari support is best-effort and
> experimental: it is not tested on each release, has no support commitment, and
> may lag behind or break whenever Chrome-first features land in `src/`. It never
> constrains the Chrome extension. See the
> [platform policy](../../docs/ARCHITECTURE.md#platform-policy-chrome-first).

Safari ships web extensions inside a native macOS app. That wrapper is generated
from [`../../src`](../../src) on demand — it is **not** committed, so it can never
drift from the source.

## Build & install

```bash
contrib/safari/build.sh --install
```

This uses Apple's `safari-web-extension-converter` to generate an Xcode project
under `contrib/safari/.generated/` (git-ignored), builds it ad-hoc signed, and
copies `AuthorRolesVenueRanks.app` to `/Applications`.

Then, in Safari:

1. **Settings → Extensions** → enable **Scholar Author Roles & Venue Ranks**.
2. For local unsigned builds, also enable **Develop → Allow Unsigned Extensions**
   (this resets every time Safari restarts).

## Requirements

- macOS with Xcode and command-line tools (`xcode-select --install`).

## Notes

- The default bundle identifier is `com.boyugou.AuthorRolesVenueRanks`. Change `BUNDLE_ID`
  in `contrib/safari/build.sh` to use your own.
- For a distributable, signed build, open the generated project in Xcode and set
  your Apple Developer team, or pass your signing identity to `xcodebuild`.
- Fixes that make Safari work again are welcome as pull requests, as long as they
  don't change Chrome behavior.
- Known gap: since 2.2 the panel's settings button asks a tiny service worker (`src/background.js`) to open the
  settings page; if Safari's converter rejects `background.service_worker`, the settings page is still
  reachable from the toolbar popup.
