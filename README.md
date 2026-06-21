# Potluck

**Let the universe decide.** Potluck is a spin-the-wheel recipe randomizer — one tap, and fate picks tonight's dinner. No scrolling, no decision fatigue, just cook.

It's the companion app to [Savor](https://getsavor.recipes), built by [CalicoSquid](https://github.com/calicosquid). Potluck pulls from the same recipe library and hands finished picks off to Savor to save, scale, and keep.

---

## What it does

- **Spin for a recipe.** The wheel pulls a random dish from the Savor backend, weighted by the time of day (breakfast picks in the morning, dinner otherwise).
- **One reading a day.** Your first spin becomes the day's canonical "reading." Rerolls let you keep looking without losing it, and locking a dish in commits it. Readings are stored locally and fade after 7 days — permanence is Savor's job.
- **Shopping list.** Each recipe's ingredients are parsed into a clean, checkable shop list, with pantry staples (salt, pepper, oil, water) filtered out and shareable in one tap.
- **Hand off to Savor.** "Save this to Savor" deep-links the recipe straight into the Savor app (or the Play Store if it isn't installed).

The whole thing is intentionally small: three screens (Spin → Recipe → Done), one fixed teal-and-orange palette, no theme system, no accounts, no sensitive permissions.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Expo](https://expo.dev) SDK 54 / React Native 0.81 / React 19 |
| Navigation | React Navigation (native stack) |
| Data | Apollo Client 4 + GraphQL, against a shared Railway/Apollo backend |
| Local storage | AsyncStorage (daily readings) |
| UI | react-native-paper (icons), expo-linear-gradient, expo-haptics |
| Builds & OTA | EAS Build + EAS Update (`expo-updates`) |

The GraphQL backend, recipe data, and image pipeline are shared with Savor and live in a separate repo.

---

## Project structure

```
src/
├── apollo/
│   ├── client.js          Apollo client + backend URI
│   └── queries.js         GraphQL queries (RANDOM_RECIPE)
├── components/
│   ├── Centerpiece.js     The spin wheel / reel / reveal card
│   ├── TypewriterVerdict.js
│   ├── PotluckHeader.js   Shared header (brand-mark, About sheet)
│   ├── PotluckButton.js   Gradient CTA button
│   ├── PotluckCard.js     White surface card
│   ├── TabBar.js          Recipe / Shop switcher
│   ├── ShopTab.js         Shopping-list UI
│   ├── IngredientList.js
│   ├── InlineTimes.js
│   ├── ComicBackground.js
│   ├── SplashTransition.js
│   └── AboutSheet.js
├── constants/
│   └── colors.js          ⭐ The single source of colour. No inline hexes.
├── lib/
│   ├── time.js            Recipe-time maths (sumTime, totalMins, fmtMins, daypartNow)
│   ├── ingredients.js     Ingredient parsing + pantry/noise filtering
│   ├── spinCopy.js        All of the wheel's voice + verdict logic
│   ├── recipe.js          HTML-entity decoding for recipe data
│   ├── readings.js        Daily-reading store (AsyncStorage, 7-day fade)
│   └── fontScaling.js
├── navigation/
│   └── RootNavigator.js   Spin · Recipe · Done
└── screens/
    ├── SpinScreen.js      The wheel — orchestration only
    ├── RecipeScreen.js    Recipe detail + Shop tab + "Lock it in"
    └── DoneScreen.js      The verdict + Savor hand-off
```

### Conventions

- **`constants/colors.js` is the one colour source.** No local palette objects, no scattered hex literals. Use `colors.*`, the `tealAlpha(a)` helper for teal washes, and the exported `TEAL_GRADIENT` / `TEAL_SHADOW`.
- **Screens orchestrate; `lib/` and `components/` do the work.** Copy, parsing, time maths, and data shaping live in `lib/` so the screens stay thin.

---

## Getting started

### Prerequisites

- Node.js 18+
- An Android emulator / iOS simulator, or a physical device with a [development build](https://docs.expo.dev/develop/development-builds/introduction/) (Potluck uses native modules, so Expo Go alone won't run it)

### Install

```bash
git clone <repo-url>
cd potluck
npm install
```

### Configure the backend

The Apollo client reads the API URL from `EXPO_PUBLIC_APOLLO_URI` and falls back to the production Railway endpoint if it's unset. To point at a different server, create a `.env`:

```bash
EXPO_PUBLIC_APOLLO_URI=https://your-graphql-endpoint
```

### Run

```bash
npx expo start          # dev server (use -c to clear the Metro cache)
npm run android         # build & run on Android
npm run ios             # build & run on iOS
```

---

## Builds & releases

Builds are handled with [EAS](https://docs.expo.dev/build/introduction/). Three profiles are defined in `eas.json`:

| Profile | Purpose |
| --- | --- |
| `development` | Internal dev client, side-by-side install (`.dev` package) |
| `preview` | Internal distribution on the `preview` channel |
| `production` | Play Store builds on the `production` channel |

```bash
eas build --profile production --platform android
eas update --channel production        # push a JS-only OTA update
```

OTA updates use the `appVersion` runtime-version policy — a JS update only reaches builds compiled against the same native version. Any native config change (a new plugin, permission, or dependency) needs a fresh build, not an OTA.

> **Before any OTA:** confirm `EXPO_PUBLIC_APOLLO_URI` points at the production backend, not a localhost or dev server.

---

## App identity

- **Package / bundle ID:** `com.calicosquid.savorpotluck` (`.dev` suffix for development builds)
- **Version:** 1.0.1
- Potluck requests **no sensitive permissions** — no camera, storage, or contacts.

---

## License

This is a CalicoSquid project. All rights reserved unless a `LICENSE` file says otherwise.