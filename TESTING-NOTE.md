# Potluck 1.0.3 / vc8 — production-candidate checklist

This pass should ship as a fresh native build so new Production installs get the funnel and splash fixes in the embedded bundle on first launch. Potluck deliberately does not check for OTA updates at startup.

## Build identity

- App version: **1.0.3**
- Android versionCode: **8**
- Existing 1.0.3 / vc7 Internal build remains the rollback baseline.

## What changed

- About auto-detects whether Savor is installed.
  - Savor missing: only **Meet Savor** + the small return-for-a-gift teaser.
  - Savor present + gift not yet sent: native **Claim your Potluck theme** CTA.
  - After a successful handoff attempt: the large gift CTA disappears, leaving only the quiet **Theme sent · Send again** status/retry line.
  - Potluck re-checks when it returns from the Play Store, so the UI should flip without a restart.
  - In dev, production `savor://` is preferred; `savor-dev://` is accepted as a fallback.
- The splash holds the completed **Spin for your Supper** phrase before fading, so a busy first launch cannot eat the final word.
- About / This Week / The Void has a real grab handle and can be dragged downward to dismiss.
- Runtime PNG artwork moved to high-quality WebP; native icon/splash PNGs remain PNG and were losslessly recompressed.
- Dead PNG duplicates, two unused font files, and the dead favicon were removed.
- The unused Gesture Handler wrapper/dependency was removed; the sheet uses core RN `PanResponder` + `Animated`.

## Dev test

1. Build/install a fresh development client.
2. Open the menu from Spin, Recipe, Done and a fresh 86 state. Confirm the intended tab still opens with no flash.
3. Drag the handle a short distance and release: sheet should spring back.
4. Drag past ~90 px (or flick down): sheet should close. Confirm internal lists/About still scroll normally.
5. With Savor installed and no prior gift handoff on this Potluck install: About should show **Claim your Potluck theme**, not Meet Savor. Tap it and confirm Savor opens and claims POTLUCK.
6. Return to Potluck and reopen About: the large gift CTA should be gone, leaving only **Theme sent to Savor · Send again**. Confirm **Send again** replays the idempotent POTLUCK claim.
7. Disable production Savor to simulate absence:

   ```powershell
   adb shell pm disable-user --user 0 com.calicosquid.savorrecipes
   ```

   If a Savor dev client is installed, disable that too when testing the truly-missing state:

   ```powershell
   adb shell pm disable-user --user 0 com.calicosquid.savorrecipes.dev
   ```

   Re-open About: it should show **Meet Savor** + the cosmos teaser.
8. Re-enable Savor and return to Potluck:

   ```powershell
   adb shell pm enable com.calicosquid.savorrecipes
   ```

   The About section should refresh without restarting Potluck. If the handoff marker from step 5 is present, it should show only the quiet **Theme sent · Send again** row; on a fresh install it should show **Claim your Potluck theme**.
9. Cold-launch repeatedly (including after force-stop) and confirm the splash always shows the complete **Spin for your Supper** phrase before fading.
10. Smoke-test the header wheel, main wheel, onboarding Savor mark, recipe Savor CTA, Done Savor CTA and share card for regressions.

For Metro after installing the new dev client:

```bash
npx expo start -c
```


## Drag sheet fix

The grab header now has its own immediate responder, while the whole bottom sheet can also be dragged downward when its active scroll view is at the top. Test from About, This Week and The Void; scroll content down first and confirm a downward gesture scrolls content until it reaches the top, then a fresh downward pull dismisses the sheet. The handle itself should work regardless of the content scroll position.
