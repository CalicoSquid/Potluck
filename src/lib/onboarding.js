// ── First-run flag ────────────────────────────────────────────────────────────
// Potluck shows its "here's how this works" sheet exactly once, on first open.
// One boolean in AsyncStorage decides it. Kept out of the screen so SpinScreen
// stays orchestration-only, matching readings.js.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "potluck_onboarded_v2";

// Resolves true if the user has already seen the intro. Fails open to `true`
// on a storage error so a broken read never traps someone in the sheet.
export const hasOnboarded = async () => {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return true;
  }
};

export const setOnboarded = async () => {
  try {
    await AsyncStorage.setItem(KEY, "1");
  } catch {
    // best-effort; worst case the sheet shows once more next launch
  }
};