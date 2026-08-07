import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { ApolloProvider } from "@apollo/client/react";
import { Provider as PaperProvider } from "react-native-paper";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";

import client from "./src/apollo/client";
import RootNavigator from "./src/navigation/RootNavigator";
import SplashTransition from "./src/components/SplashTransition";

// Keep the native splash up until we explicitly hide it.
SplashScreen.preventAutoHideAsync().catch(() => {});

// How long the app has to have been away before a resume is worth an update
// check — and the floor between two checks in one session.
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Raleway:         require("./assets/fonts/Raleway-Regular.ttf"),
    RalewayBold:     require("./assets/fonts/Raleway-Bold.ttf"),
    RalewaySemiBold: require("./assets/fonts/Raleway-SemiBold.ttf"),
  });

  const fontsReady = fontsLoaded || !!fontError;

  // ── Updates ───────────────────────────────────────────────────────────────
  // Savor's model, now that testing is over: nothing at launch, ever.
  //
  // Checking on first open meant a fetch could land seconds after the splash
  // lifted, and applying it replayed the whole boot — splash, app, splash. The
  // double splash testers were seeing was that, by design, and it was only ever
  // worth it to shorten the loop for testers on a hot bug.
  //
  // Instead: check when the app comes back from a real absence. Thirty minutes
  // away means the session is over anyway, so a reload costs nothing the user
  // was in the middle of, and expo-updates still installs anything fetched at
  // the next cold start regardless.
  const backgroundedAtRef = useRef(null);
  const lastCheckRef = useRef(Date.now());

  useEffect(() => {
    if (__DEV__) return undefined;

    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        // Only stamp the first transition out — iOS fires inactive then
        // background, and the second would reset the clock to "just left".
        if (backgroundedAtRef.current == null) {
          backgroundedAtRef.current = Date.now();
        }
        return;
      }
      if (next !== "active") return;

      const leftAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;

      const now = Date.now();
      if (!leftAt || now - leftAt < UPDATE_CHECK_INTERVAL) return;
      if (now - lastCheckRef.current < UPDATE_CHECK_INTERVAL) return;
      lastCheckRef.current = now;

      Updates.checkForUpdateAsync()
        .then((update) => (update.isAvailable ? Updates.fetchUpdateAsync() : null))
        .then((fetched) => {
          if (fetched?.isNew) Updates.reloadAsync().catch(() => {});
        })
        .catch(() => {});
    });

    return () => sub.remove();
  }, []);

  // Called by SplashTransition on its first onLayout — hides the native splash
  // the moment the JS white background is painted, eliminating the gray gap.
  const handleSplashReady = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {
      // already hidden
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#fffefe" }}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#fffefe" }}>

        {/* Mounted from the first frame, UNDER the splash. It used to mount
            only once the splash had finished, so everything the first paint
            depends on — safe-area insets resolving, the header's onLayout
            setting headerHeight (which gates ComicBackground), the AsyncStorage
            read that clears `booting` — all happened in full view, one after
            another. That cascade is the flash. Behind the splash it costs
            nothing: by the time the curtain lifts the screen has settled. */}
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <ApolloProvider client={client}>
            <PaperProvider>
              <RootNavigator />
            </PaperProvider>
          </ApolloProvider>
        </SafeAreaProvider>

        {/* Absolute so it covers the app rather than displacing it. Above the
            onboarding overlay's zIndex 50. */}
        {!splashDone && (
          <View style={styles.splashLayer}>
            <SplashTransition
              onReadyToPaint={handleSplashReady}
              onDone={() => setSplashDone(true)}
              fontsReady={fontsReady}
            />
          </View>
        )}

      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  splashLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fffefe",
    zIndex: 100,
    elevation: 100,
  },
});