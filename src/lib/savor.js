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

export const openSavorStore = () => {
  Linking.openURL(STORE_URL).catch(() => {});
};

export default saveToSavor;