import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
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

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  // Read inside async callbacks, where `splashDone` would be stale.
  const splashDoneRef = useRef(false);

  const [fontsLoaded, fontError] = useFonts({
    Raleway:         require("./assets/fonts/Raleway-Regular.ttf"),
    RalewayBold:     require("./assets/fonts/Raleway-Bold.ttf"),
    RalewaySemiBold: require("./assets/fonts/Raleway-SemiBold.ttf"),
  });

  const fontsReady = fontsLoaded || !!fontError;

  // Apply an update the moment it lands, but ONLY while the splash is still up.
  //
  // Reloading is violent — it tears the running app down and replays the splash.
  // The old version did that whenever the fetch happened to finish, which during
  // an active OTA run meant: splash, app, then a hard restart back into splash a
  // few seconds later. That was the flash.
  //
  // But deferring to the next launch is worse during testing: a tester who opens
  // the app for thirty seconds a day would sit on a known bug for an extra day.
  //
  // So: if the download beats the splash, reload behind the curtain and the
  // tester gets the fix in this session, having seen nothing but a slightly
  // longer splash. If it doesn't, leave it — expo-updates installs a fetched
  // bundle on the next cold start anyway, and by then the user is in the app,
  // where a reload is never worth it.
  useEffect(() => {
    if (__DEV__) return;
    Updates.checkForUpdateAsync()
      .then((update) => {
        if (!update.isAvailable) return null;
        return Updates.fetchUpdateAsync();
      })
      .then((fetched) => {
        if (!fetched?.isNew) return;
        if (splashDoneRef.current) return; // user is in the app — wait for next launch
        Updates.reloadAsync().catch(() => {});
      })
      .catch(() => {});
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
              onDone={() => {
                splashDoneRef.current = true;
                setSplashDone(true);
              }}
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