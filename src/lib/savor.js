import { Linking, Platform } from "react-native";

// Where an install lands if Savor isn't on the device. Potluck ships iOS config,
// so hardcoding Play would send an iPhone to an Android listing.
const STORE_URL = Platform.select({
  ios: "https://apps.apple.com/app/savor-recipes/id0000000000",
  android:
    "https://play.google.com/store/apps/details?id=com.calicosquid.savorrecipes",
  default:
    "https://play.google.com/store/apps/details?id=com.calicosquid.savorrecipes",
});

const POTLUCK_THEME_ID = "POTLUCK";

// Production first so a dev Potluck build still exercises the real user path
// whenever the Play build of Savor is installed. `savor-dev` is a fallback for
// local testing when only Savor's dev client is present.
const SAVOR_SCHEMES = __DEV__ ? ["savor", "savor-dev"] : ["savor"];

// Returns the scheme Potluck can actually hand off to, or null if Savor is not
// installed. Android 11+ only answers this reliably because app.config wires a
// matching <queries> declaration into the native manifest (new binary required).
export const getInstalledSavorScheme = async () => {
  for (const scheme of SAVOR_SCHEMES) {
    try {
      if (await Linking.canOpenURL(`${scheme}://collab`)) return scheme;
    } catch {
      // Keep checking. A missing/undeclared scheme should behave like absent,
      // never break the About sheet.
    }
  }
  return null;
};

export const isSavorInstalled = async () =>
  Boolean(await getInstalledSavorScheme());

// The whole point of Potluck: hand a dish over to Savor, where it's permanent.
// Deep link if Savor is installed; the store if it isn't.
//
// Lives here rather than on DoneScreen because Done is one screen a user sees
// once a day, and the dishes they most want to keep are the ones they *didn't*
// commit to — the history panel says "Liked one? Save it to Savor before it's
// gone", so the action has to exist wherever a recipe does.
export const saveToSavor = (recipeId) => {
  if (!recipeId) return;
  const url = `https://getsavor.recipes/r/${recipeId}`;
  Linking.openURL(`savor://create?url=${encodeURIComponent(url)}`).catch(() => {
    Linking.openURL(STORE_URL).catch(() => {});
  });
};

// Potluck's free Savor skin uses the same generic collaboration handoff as
// partner themes. About only shows this action after `getInstalledSavorScheme`
// confirms Savor is present, but the store fallback stays here as a last-resort
// guard against an uninstall/race between detection and tapping.
export const claimPotluckSavorTheme = (scheme = "savor") => {
  const targetScheme =
    __DEV__ && scheme === "savor-dev" ? "savor-dev" : "savor";
  const url = `${targetScheme}://collab?id=${encodeURIComponent(POTLUCK_THEME_ID)}`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(STORE_URL).catch(() => {});
  });
};

export const openSavorStore = () => {
  Linking.openURL(STORE_URL).catch(() => {});
};

export default saveToSavor;