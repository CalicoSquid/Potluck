# Potluck 1.0.3 / vc7 — dev test checklist

This pass needs a fresh native build. It adds Android package visibility for Savor detection, so an OTA update alone cannot exercise the installed/not-installed UI.

## Build identity

- App version: **1.0.3**
- Android versionCode: **7**
- Existing 1.0.2 / vc6 remains the rollback baseline.

## What changed

- About auto-detects whether Savor is installed.
  - Savor missing: only **Meet Savor** + the small return-for-a-gift teaser.
  - Savor present: only the compact **Accept the gift** Potluck-theme action.
  - Potluck re-checks when it returns from the Play Store, so the UI should flip without a restart.
  - In dev, production `savor://` is preferred; `savor-dev://` is accepted as a fallback.
- About / This Week / The Void has a real grab handle and can be dragged downward to dismiss.
- Runtime PNG artwork moved to high-quality WebP; native icon/splash PNGs remain PNG and were losslessly recompressed.
- Two unused font files and a dead favicon were removed.

## Dev test

1. Build/install a fresh development client.
2. Open the menu from Spin, Recipe, Done and a fresh 86 state. Confirm the intended tab still opens with no flash.
3. Drag the handle a short distance and release: sheet should spring back.
4. Drag past ~90 px (or flick down): sheet should close. Confirm internal lists/About still scroll normally.
5. With Savor installed: About should show **Accept the gift**, not Meet Savor. Tap it and confirm the POTLUCK claim opens.
6. Disable production Savor to simulate absence:

   ```powershell
   adb shell pm disable-user --user 0 com.calicosquid.savorrecipes
   ```

   If a Savor dev client is installed, disable that too when testing the truly-missing state:

   ```powershell
   adb shell pm disable-user --user 0 com.calicosquid.savorrecipes.dev
   ```

   Re-open About: it should show **Meet Savor** + the cosmos teaser.
7. Re-enable Savor and return to Potluck:

   ```powershell
   adb shell pm enable com.calicosquid.savorrecipes
   ```

   The About section should switch to **Accept the gift** without restarting Potluck.
8. Smoke-test the splash, header wheel, main wheel, onboarding Savor mark, recipe Savor CTA, Done Savor CTA and share card for any asset regressions.

For Metro after installing the new dev client:

```bash
npx expo start -c
```
