# Safari (macOS)

Safari ships web extensions inside a native macOS app. That wrapper is generated
from [`../../src`](../../src) on demand — it is **not** committed, so it can never
drift from the source.

## Build & install

```bash
scripts/build-safari.sh --install
```

This uses Apple's `safari-web-extension-converter` to generate an Xcode project
under `platforms/safari/.generated/` (git-ignored), builds it ad-hoc signed, and
copies `Scholar Lens.app` to `/Applications`.

Then, in Safari:

1. **Settings → Extensions** → enable **Scholar Lens**.
2. For local unsigned builds, also enable **Develop → Allow Unsigned Extensions**
   (this resets every time Safari restarts).

## Requirements

- macOS with Xcode and command-line tools (`xcode-select --install`).

## Notes

- The default bundle identifier is `com.boyugou.Scholar-Lens`. Change `BUNDLE_ID`
  in `scripts/build-safari.sh` to use your own.
- For a distributable, signed build, open the generated project in Xcode and set
  your Apple Developer team, or pass your signing identity to `xcodebuild`.
