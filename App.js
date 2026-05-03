import React, { useState, useCallback } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApolloProvider } from "@apollo/client/react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import client from "./src/apollo/client";
import RootNavigator from "./src/navigation/RootNavigator";
import SplashTransition from "./src/components/SplashTransition";

// Keep the native splash up until we explicitly hide it.
// Without this, the OS hides the native splash as soon as the JS bundle
// starts running — well before our content is ready to paint.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Raleway:         require("./assets/fonts/Raleway-Regular.ttf"),
    RalewayBold:     require("./assets/fonts/Raleway-Bold.ttf"),
    RalewaySemiBold: require("./assets/fonts/Raleway-SemiBold.ttf"),
  });

  // The JS splash only mounts once fonts are ready (or failed to load).
  // While we're waiting, the native splash stays up — no gray gap.
  const fontsReady = fontsLoaded || !!fontError;

  // Called by SplashTransition once it has painted its first frame.
  // ONLY THEN do we hide the native splash. This guarantees zero gap
  // between native splash and JS splash.
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
        {fontsReady && !splashDone && (
          <SplashTransition
            onReadyToPaint={handleSplashReady}
            onDone={() => setSplashDone(true)}
          />
        )}

        {splashDone && (
          <SafeAreaProvider>
            <ApolloProvider client={client}>
              <RootNavigator />
            </ApolloProvider>
          </SafeAreaProvider>
        )}
      </GestureHandlerRootView>
    </View>
  );
}